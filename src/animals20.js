// 頭 20 隻動物（Biome 1–3）嘅新設計：小朋友話舊嘅好醜，重新砌過
// 方塊（Roblox）風格，但係大頭、大眼（有眼白同反光）、腳掌、花紋、羽毛層次、一節節識擺嘅身
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, BLACK, WHITE } from './modelKit.js';

const PI = Math.PI;

// 側面嘅眼（魚、鯨用）：喺 (±x, y, z) 兩邊各一隻，面向外面
export function sideEyes(parent, x, y, z, size, { pupil = BLACK } = {}) {
  for (const s of [-1, 1]) {
    const p = pivot(parent, s * x, y, z);
    p.rotation.y = s * PI / 2 + PI; // 塊面向外
    box(p, size * 1.05, size * 1.15, 0.03, 0xffffff, 0, 0, 0, 0.35);
    box(p, size * 0.55, size * 0.65, 0.03, pupil, 0, -size * 0.08, -0.02, 0.4);
    box(p, size * 0.22, size * 0.22, 0.02, 0xffffff, size * 0.15, size * 0.18, -0.035, 0.4);
  }
}

// ================= 四隻腳嘅動物 =================
// o.body {w,h,d,y,color}  o.head {w,h,d,y,z,color}  o.legs {w,h,x,zf,zb,color,paw?,toes?}
export function beast(o) {
  const g = new THREE.Group();
  const root = pivot(g);
  const L = o.legs;
  const legs = [];
  for (const [x, z, phase] of [[-L.x, L.zf, 0], [L.x, L.zf, PI], [-L.x, L.zb, PI], [L.x, L.zb, 0]]) {
    const hip = pivot(root, x, L.h, z);
    box(hip, L.w, L.h, L.w, L.color, 0, -L.h / 2, 0, 0.3);
    if (L.paw) box(hip, L.w * 1.1, L.h * 0.2, L.w * 1.15, L.paw, 0, -L.h * 0.9, -L.w * 0.04, 0.35);
    if (L.toes) for (const tx of [-1, 0, 1]) box(hip, L.w * 0.24, L.w * 0.18, 0.07, L.toes, tx * L.w * 0.3, -L.h + L.w * 0.1, -L.w * 0.56, 0.4);
    legs.push({ hip, phase });
  }
  const B = o.body;
  box(root, B.w, B.h, B.d, B.color, 0, B.y, 0, 0.3);
  if (o.belly) box(root, B.w * 0.82, B.h * 0.3, B.d * 0.82, o.belly, 0, B.y - B.h * 0.4, 0, 0.35);
  const H = o.head;
  const neck = pivot(root, 0, H.y, H.z);
  const head = pivot(neck);
  box(head, H.w, H.h, H.d, H.color, 0, 0, 0, 0.32);
  if (o.eyes !== false) cuteEyes(head, H.w * 0.24, H.h * 0.12, -H.d / 2 - 0.015, o.eyeSize ?? H.w * 0.19, o.eyeOpts);
  let tail = null;
  if (o.tail) {
    const T = o.tail;
    tail = pivot(root, 0, T.y, B.d / 2 - 0.05);
    box(tail, T.w, T.h, T.d, T.color, 0, 0, T.d / 2, 0.35);
    if (T.tip) box(tail, T.w * 1.3, T.w * 1.3, T.w * 1.6, T.tip, 0, 0, T.d, 0.4);
    tail.rotation.x = T.angle ?? 0;
  }
  const parts = { g, root, head, neck, tail, legs, ears: [] };
  o.extras?.(parts);

  const speed = o.walkSpeed ?? 9;
  const swing = o.swing ?? 0.55;
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * swing * moving;
    root.position.y = Math.abs(Math.sin(t * speed)) * 0.05 * moving;
    neck.rotation.x = Math.sin(t * 2) * 0.05 + Math.sin(t * speed * 2) * 0.03 * moving; // 點頭
    neck.rotation.y = Math.sin(t * 0.7) * 0.28 * (1 - moving); // 企定時四圍望
    if (tail) tail.rotation.y = Math.sin(t * 6) * 0.35;
    parts.ears.forEach((e, i) => (e.rotation.z = Math.max(0, Math.sin(t * 1.3 + i)) > 0.95 ? Math.sin(t * 30) * 0.3 : 0)); // 耳仔郁一郁
    parts.animate?.(t, moving);
  };
  g.userData.height = Math.max(B.y + B.h / 2, H.y + H.h / 2) + (o.extraHeight || 0);
  g.userData.move = 'walk';
  return g;
}

// ================= 游水嘅動物（一節節，擺起嚟好似波浪）=================
// whale = 上下擺（鯨、海豚、儒艮）；否則左右擺（魚、鯊）
export function swimmer({ skin, belly, len, w, h, whale = true, dorsal = 0, eyeSize, eyeZ = 0.3, extras }) {
  const g = new THREE.Group();
  const swimY = h / 2 + 0.35;
  const root = pivot(g, 0, swimY, 0);
  const headLen = len * 0.4;
  // 頭 + 前身
  box(root, w, h, headLen, skin, 0, 0, -len / 2 + headLen / 2, 0.38);
  box(root, w * 0.86, h * 0.4, headLen * 0.9, belly, 0, -h * 0.32, -len / 2 + headLen / 2, 0.4);
  sideEyes(root, w / 2 + 0.01, h * 0.08, -len / 2 + headLen * eyeZ, eyeSize ?? Math.max(0.08, w * 0.14));
  // 中身
  const mid = pivot(root, 0, 0, -len / 2 + headLen);
  box(mid, w * 0.9, h * 0.88, len * 0.32, skin, 0, 0, len * 0.16, 0.38);
  box(mid, w * 0.76, h * 0.36, len * 0.3, belly, 0, -h * 0.3, len * 0.16, 0.4);
  if (dorsal) {
    const fin = box(mid, 0.08, h * dorsal, len * 0.1, skin, 0, h * 0.4 + h * dorsal * 0.3, len * 0.18, 0.3);
    fin.rotation.x = 0.45;
  }
  // 尾段
  const rear = pivot(mid, 0, 0, len * 0.32);
  box(rear, w * 0.6, h * 0.58, len * 0.22, skin, 0, 0, len * 0.11, 0.38);
  const fluke = pivot(rear, 0, 0, len * 0.22);
  if (whale) {
    for (const s of [-1, 1]) {
      const lobe = box(fluke, w * 0.8, 0.08, len * 0.12, skin, s * w * 0.35, 0, len * 0.05, 0.4);
      lobe.rotation.y = s * 0.35;
    }
  } else {
    box(fluke, 0.08, h * 1.1, len * 0.1, skin, 0, h * 0.28, len * 0.06, 0.35).rotation.x = 0.35; // 上尾鰭大啲
    box(fluke, 0.08, h * 0.6, len * 0.08, skin, 0, -h * 0.2, len * 0.04, 0.35).rotation.x = -0.4;
  }
  // 胸鰭
  const fins = [-1, 1].map((s) => {
    const fp = pivot(root, s * w * 0.45, -h * 0.25, -len / 2 + headLen * 0.75);
    box(fp, w * 0.55, 0.06, len * 0.1, skin, s * w * 0.27, 0, 0.04, 0.35).rotation.y = s * -0.35;
    return { fp, s };
  });
  const parts = { g, root, mid, rear, fluke, headLen };
  extras?.(parts);
  g.userData.animate = (t, moving) => {
    const sp = 2.6 + moving * 2;
    const axis = whale ? 'x' : 'y';
    const a = whale ? 0.1 : 0.16;
    mid.rotation[axis] = Math.sin(t * sp) * a;
    rear.rotation[axis] = Math.sin(t * sp - 0.9) * a * 1.5;
    fluke.rotation[axis] = Math.sin(t * sp - 1.8) * a * 2.2;
    fins.forEach(({ fp, s }) => (fp.rotation.z = s * Math.sin(t * 2) * 0.25));
    root.position.y = swimY + Math.sin(t * 1.5) * 0.12;
  };
  g.userData.height = swimY + h;
  g.userData.move = 'swim';
  return g;
}

// ================= 雀 =================
// 身有兩層（羽毛同心口）、勾嘴、翼有翼尖色、尾巴三條羽毛扇開、腳有腳趾
export function bird(o) {
  const {
    body, belly = body, head: headColor = body, wing = body, wingTip = wing, tail: tailColor = wing, tailTip = tailColor,
    beak = 0x2b2b2b, beakLower = beak, face = null, crest = null, eyeRing = null, legColor = 0x6d6d6d,
    size = 1, tailLen = 0.7, chunky = false, flightless = false, bald = false, eyeOpts,
  } = o;
  const g = new THREE.Group();
  const root = pivot(g);
  const bw = chunky ? 0.66 : 0.52;
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.13, chunky ? 0.32 : 0.44, 0);
    box(hip, 0.07, chunky ? 0.28 : 0.4, 0.07, legColor, 0, chunky ? -0.14 : -0.2, 0, 0.3);
    for (const tx of [-1, 0, 1]) box(hip, 0.05, 0.04, 0.16, legColor, tx * 0.06, chunky ? -0.3 : -0.42, -0.07, 0.3); // 腳趾
    return hip;
  });
  const bodyY = chunky ? 0.7 : 0.8;
  const torso = box(root, bw, chunky ? 0.66 : 0.6, 0.6, body, 0, bodyY, 0.02, 0.38);
  torso.rotation.x = 0.25;
  box(root, bw * 0.75, 0.45, 0.12, belly, 0, bodyY - 0.05, -0.24, 0.4).rotation.x = 0.25; // 心口
  const head = pivot(root, 0, bodyY + 0.47, -0.12);
  box(head, 0.48, 0.44, 0.44, bald ? headColor : headColor, 0, 0, 0, 0.4);
  if (face) box(head, 0.4, 0.26, 0.05, face, 0, -0.04, -0.215, 0.4);
  if (eyeRing) for (const s of [-1, 1]) box(head, 0.15, 0.17, 0.03, eyeRing, s * 0.12, 0.06, -0.225, 0.4);
  cuteEyes(head, 0.12, 0.06, -0.24, 0.1, eyeOpts);
  // 勾嘴：上嘴 + 勾尖 + 下嘴
  box(head, 0.17, 0.14, 0.17, beak, 0, -0.02, -0.3, 0.35);
  box(head, 0.11, 0.13, 0.08, beak, 0, -0.12, -0.37, 0.35);
  box(head, 0.12, 0.07, 0.11, beakLower, 0, -0.13, -0.28, 0.35);
  if (crest) for (let i = 0; i < 4; i++) {
    const c = box(head, 0.07, 0.3 - i * 0.03, 0.07, crest, (i - 1.5) * 0.09, 0.27, 0.12, 0.3);
    c.rotation.x = 0.7;
    c.rotation.z = (i - 1.5) * 0.15;
  }
  const wings = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * (bw / 2 + 0.02), bodyY + 0.2, 0.02);
    box(shoulder, 0.08, 0.5, 0.46, wing, s * 0.03, -0.22, 0.04, 0.38);
    box(shoulder, 0.08, 0.24, 0.38, wingTip, s * 0.03, -0.55, 0.12, 0.38);
    return { shoulder, s };
  });
  const tail = pivot(root, 0, bodyY - 0.2, 0.3);
  tail.rotation.x = 0.6;
  for (const i of [-1, 0, 1]) {
    const f = pivot(tail, i * 0.07, 0, 0);
    f.rotation.y = i * 0.12;
    box(f, 0.08, 0.04, tailLen, tailColor, 0, 0, tailLen / 2, 0.3);
    box(f, 0.08, 0.04, tailLen * 0.25, tailTip, 0, 0, tailLen * 0.9, 0.3);
  }
  g.scale.setScalar(size);
  g.userData.move = flightless ? 'walk' : 'fly';
  g.userData.animate = (t, moving) => {
    if (g.userData.flying) {
      // 飛緊：一路拍翼、對腳收埋、身向前傾
      legs.forEach((l) => (l.rotation.x = 0.9));
      root.rotation.x = 0.35;
      root.position.y = 0;
      wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * (0.35 + Math.sin(t * 14) * 0.95)));
      head.rotation.set(-0.3, 0, 0);
      return;
    }
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + i * PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.06 * moving;
    const flap = Math.max(0, Math.sin(t * 1.3)) > 0.85 ? Math.sin(t * 25) * 0.9 : 0.05; // 間中拍下翼
    wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * Math.abs(flap)));
    head.rotation.y = Math.sin(t * 1.7) * 0.4 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.9) * 0.15; // 側頭睇你
    tail.rotation.x = 0.6 + Math.sin(t * 3) * 0.05;
  };
  g.userData.height = 1.55 * size;
  return g;
}


// =====================================================================
// 2026-10-17 第二版（小朋友：「make all pets look good」）
// 上面 beast／swimmer／bird 保留（animals30.js、fusePets.js 用緊），下面係呢 20 隻專用嘅新砌法：
// 四腳動物有心口、屁股、膊頭同腳膝（行路會屈膝）、口鼻；游水嘅一節節收窄、尾鰭有形；雀有收埋嘅多層翼、側面嘅眼、唔同款嘅嘴
// =====================================================================

// 側面眼（雀、四腳動物用）：喺頭兩邊前少少，微微向前望；有眼白、眼珠、反光
function sideFaceEyes(head, x, y, z, size, { pupil = BLACK, iris = null, white = 0xffffff, turn = 0.55 } = {}) {
  for (const s of [-1, 1]) {
    const p = pivot(head, s * x, y, z);
    p.rotation.y = s * -turn; // 塊面向前外
    box(p, size * 1.05, size * 1.15, 0.03, white, 0, 0, -0.005, 0.38);
    if (iris) box(p, size * 0.8, size * 0.9, 0.03, iris, 0, -size * 0.04, -0.015, 0.42);
    box(p, size * 0.55, size * 0.66, 0.03, pupil, 0, -size * 0.08, -0.025, 0.42);
    box(p, size * 0.24, size * 0.24, 0.02, 0xffffff, -s * size * 0.14, size * 0.2, -0.04, 0.4);
  }
}

// ================= 四腳動物（新）=================
// o.body {w,h,d,y,color, chest?, rump?}  o.head {w,h,d,y,z,color}  o.muzzle {w,h,d,y,color}  o.nose
// o.legs {w,h,x,zf,zb,color,foot,hoof?,toes?,thigh?}  o.neck {w,h,len,angle,color}  o.tail {seg,w,len,y,color,tip,angle}
function quad(o) {
  const g = new THREE.Group();
  const root = pivot(g);
  const L = o.legs;
  const legs = [];
  for (const [x, z, phase, front] of [[-L.x, L.zf, 0, 1], [L.x, L.zf, PI, 1], [-L.x, L.zb, PI, 0], [L.x, L.zb, 0, 0]]) {
    const hip = pivot(root, x, L.h, z);
    const tw = L.w * (front ? 1.1 : 1.2);
    box(hip, tw, L.h * 0.52, tw * 1.05, L.thigh ?? L.color, 0, -L.h * 0.22, 0, 0.34); // 大髀
    const knee = pivot(hip, 0, -L.h * 0.48, 0);
    box(knee, L.w, L.h * 0.56, L.w, L.color, 0, -L.h * 0.24, 0, 0.35);
    const fh = L.hoof ? L.h * 0.12 : L.h * 0.15;
    box(knee, L.w * 1.12, fh, L.w * 1.22, L.foot ?? L.color, 0, -L.h * 0.52 + fh / 2 - 0.005, -L.w * 0.06, L.hoof ? 0.25 : 0.42);
    if (L.toes) for (const tx of [-1, 0, 1]) box(knee, L.w * 0.24, L.w * 0.16, 0.06, L.toes, tx * L.w * 0.32, -L.h * 0.52 + L.w * 0.09, -L.w * 0.66, 0.45);
    legs.push({ hip, knee, phase, front });
  }
  const B = o.body;
  // 身：中間一嚿成條，前面心口同後面屁股微微脹啲（唔好見到一節節）
  box(root, B.w, B.h, B.d, B.color, 0, B.y, 0, 0.3);
  const chest = box(root, B.w * 1.03, B.h * 1.03, B.d * 0.4, B.chest ?? B.color, 0, B.y + B.h * 0.015, -B.d * 0.29, 0.34);
  box(root, B.w * 1.01, B.h * 1.0, B.d * 0.36, B.rump ?? B.color, 0, B.y + B.h * 0.01, B.d * 0.31, 0.34);
  if (o.belly) box(root, B.w * 0.8, B.h * 0.32, B.d * 0.86, o.belly, 0, B.y - B.h * 0.38, 0, 0.42);
  let neckRoot = root;
  let headY = o.head.y;
  let headZ = o.head.z;
  if (o.neck) {
    const N = o.neck;
    const np = pivot(root, 0, B.y + B.h * 0.25, -B.d * 0.42);
    np.rotation.x = -N.angle;
    box(np, N.w, N.len, N.h, N.color ?? B.color, 0, N.len / 2 - 0.05, 0, 0.42);
    neckRoot = np;
    headY = N.len - 0.05;
    headZ = 0;
  }
  const H = o.head;
  const neck = pivot(neckRoot, 0, headY, headZ);
  const head = pivot(neck);
  if (o.neck) head.rotation.x = o.neck.angle; // 個頭擺返正
  box(head, H.w, H.h, H.d, H.color, 0, 0, 0, 0.4);
  if (H.cheek) for (const s of [-1, 1]) box(head, H.w * 0.3, H.h * 0.5, H.d * 0.6, H.cheek, s * H.w * 0.4, -H.h * 0.14, -H.d * 0.06, 0.45);
  if (o.muzzle) {
    const M = o.muzzle;
    box(head, M.w, M.h, M.d, M.color ?? H.color, 0, M.y ?? -H.h * 0.18, -H.d / 2 - M.d / 2 + 0.05, 0.42);
    if (o.nose) box(head, M.w * 0.5, M.h * 0.32, 0.08, o.nose, 0, (M.y ?? -H.h * 0.18) + M.h * 0.28, -H.d / 2 - M.d + 0.04, 0.45);
  }
  if (o.eyes !== false) {
    const es = o.eyeSize ?? H.w * 0.18;
    sideFaceEyes(head, H.w * 0.3, H.h * 0.14, -H.d / 2 + es * 0.25, es, { turn: 0.3, ...(o.eyeOpts || {}) });
  }
  let tail = null;
  const tailSegs = [];
  if (o.tail) {
    const T = o.tail;
    tail = pivot(root, 0, T.y, B.d / 2 + 0.02);
    tail.rotation.x = T.angle ?? 0;
    let parent = tail;
    const n = T.seg ?? 3;
    for (let i = 0; i < n; i++) {
      const sp = pivot(parent, 0, 0, i ? T.len / n : 0);
      const k = 1 - i * (T.taper ?? 0.18); // 越尾越幼（紅熊貓條尾唔使收得咁多）
      const col = i === n - 1 && T.tip ? T.tip : T.rings && i % 2 ? T.rings : T.color;
      box(sp, T.w * k, T.w * k, T.len / n + 0.04, col, 0, 0, T.len / n / 2, 0.42);
      tailSegs.push(sp);
      parent = sp;
    }
  }
  const parts = { g, root, head, neck, tail, legs, ears: [], chest };
  o.extras?.(parts);

  const speed = o.walkSpeed ?? 9;
  const swing = o.swing ?? 0.5;
  g.userData.animate = (t, moving) => {
    for (const l of legs) {
      const a = Math.sin(t * speed + l.phase);
      l.hip.rotation.x = a * swing * moving;
      l.knee.rotation.x = Math.max(0, l.front ? -a : a) * swing * 1.1 * moving; // 屈膝
    }
    root.position.y = Math.abs(Math.sin(t * speed)) * 0.05 * moving;
    chest.scale.y = 1 + Math.sin(t * 2.2) * 0.02; // 呼吸
    neck.rotation.x = Math.sin(t * 2) * 0.05 + Math.sin(t * speed * 2) * 0.03 * moving;
    neck.rotation.y = Math.sin(t * 0.7) * 0.3 * (1 - moving);
    tailSegs.forEach((sp, i) => (sp.rotation.y = Math.sin(t * 5 - i * 0.6) * (0.2 + i * 0.1)));
    parts.ears.forEach((e, i) => (e.rotation.z = Math.max(0, Math.sin(t * 1.3 + i)) > 0.95 ? Math.sin(t * 30) * 0.3 : 0));
    parts.animate?.(t, moving);
  };
  g.userData.height = Math.max(B.y + B.h / 2, (o.neck ? B.y + o.neck.len + H.h / 2 : H.y + H.h / 2)) + (o.extraHeight || 0);
  g.userData.move = 'walk';
  return g;
}

function panda() {
  const black = 0x1d1d1d;
  return quad({
    body: { w: 1.25, h: 1.05, d: 1.55, y: 1.05, color: WHITE, chest: black },
    head: { w: 1.08, h: 0.95, d: 0.88, y: 1.62, z: -1.02, color: WHITE, cheek: WHITE },
    muzzle: { w: 0.5, h: 0.32, d: 0.24, y: -0.22, color: 0xfdfdf8 },
    nose: black,
    legs: { w: 0.42, h: 0.72, x: 0.36, zf: -0.5, zb: 0.5, color: black, foot: 0x262626 },
    tail: { seg: 1, w: 0.24, len: 0.18, y: 1.2, color: WHITE },
    eyes: false,
    walkSpeed: 7,
    swing: 0.42,
    extras(p) {
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.4, 0.44, 0.06);
        box(ear, 0.34, 0.32, 0.2, black, 0, 0.1, 0, 0.5);
        p.ears.push(ear);
        const patch = box(p.head, 0.3, 0.38, 0.05, black, s * 0.23, 0.05, -0.44, 0.5); // 斜斜黑眼圈
        patch.rotation.z = s * -0.4;
        const ep = pivot(p.head, s * 0.23, 0.08, -0.475);
        box(ep, 0.1, 0.12, 0.03, 0xffffff, 0, 0, 0, 0.4);
        box(ep, 0.06, 0.08, 0.03, BLACK, 0, -0.01, -0.012, 0.4);
        box(ep, 0.03, 0.03, 0.02, 0xffffff, s * -0.015, 0.025, -0.025, 0.4);
      }
      box(p.head, 0.12, 0.03, 0.03, 0x5d4037, 0, -0.32, -0.58, 0.3); // 口
      // 前腳攬住竹（坐低食嘢咁）
      const bamboo = pivot(p.head, 0.05, -0.3, -0.62);
      bamboo.rotation.z = 0.35;
      box(bamboo, 0.07, 1.0, 0.07, 0x7cb342, 0, -0.1, 0, 0.3);
      for (const y of [-0.45, -0.05, 0.3]) box(bamboo, 0.09, 0.05, 0.09, 0x558b2f, 0, y, 0, 0.3);
      for (const r of [0.6, -0.4]) box(bamboo, 0.24, 0.04, 0.1, 0x9ccc65, 0.08, 0.42, 0, 0.3).rotation.z = r;
      p.animate = (t) => (bamboo.rotation.x = Math.sin(t * 3) * 0.08); // 咬竹
    },
  });
}

function elephant(forest) {
  const skin = forest ? 0x6f6a65 : 0x9a948c;
  const dark = forest ? 0x5b5651 : 0x847e77;
  const pinkIn = 0xcf9f98;
  const g = quad({
    body: { w: 2.0, h: 1.75, d: 2.6, y: 2.2, color: skin },
    head: { w: 1.35, h: 1.3, d: 1.1, y: 2.7, z: -1.62, color: skin },
    legs: { w: 0.62, h: 1.45, x: 0.6, zf: -0.82, zb: 0.82, color: skin, foot: dark, toes: 0xf1e8d8 },
    tail: { seg: 3, w: 0.1, len: 0.8, y: 2.45, color: skin, tip: 0x3e3a36, angle: 1.0 },
    eyeSize: 0.12,
    walkSpeed: 5.5,
    swing: 0.32,
    extras(p) {
      box(p.head, 1.1, 0.4, 0.8, skin, 0, 0.62, 0.08, 0.5); // 額頭（兩嚿）
      for (const y of [1.7, 2.05, 2.4]) box(p.root, 2.04, 0.04, 1.6, dark, 0, y, 0.1, 0.3); // 皮膚皺紋
      // 大耳仔：三塊疊住，形狀似非洲地圖（森林象細啲、圓啲）
      const earH = forest ? 0.95 : 1.5;
      const earD = forest ? 0.85 : 1.25;
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.66, 0.2, 0.12);
        box(ear, 0.1, earH, earD, skin, s * 0.05, -earH * 0.15, earD * 0.42, 0.42);
        box(ear, 0.1, earH * 0.55, earD * 0.55, skin, s * 0.05, -earH * 0.62, earD * 0.3, 0.45); // 耳垂
        box(ear, 0.04, earH * 0.7, earD * 0.72, pinkIn, s * -0.02, -earH * 0.15, earD * 0.42, 0.42);
        return { ear, s };
      });
      // 象鼻：五節，越落越幼，向前彎
      let parent = p.head;
      const trunk = [];
      [0.44, 0.38, 0.32, 0.27, 0.22].forEach((w, i) => {
        const seg = pivot(parent, 0, i === 0 ? -0.35 : -0.36, i === 0 ? -0.55 : 0);
        box(seg, w, 0.42, w, skin, 0, -0.18, 0, 0.42);
        if (i % 2) box(seg, w * 1.04, 0.04, w * 1.04, dark, 0, -0.1, 0, 0.3); // 鼻上嘅紋
        if (i === 4) box(seg, w * 1.08, 0.08, w * 1.08, pinkIn, 0, -0.38, 0, 0.42);
        trunk.push(seg);
        parent = seg;
      });
      // 象牙：彎彎向前向上
      for (const s of [-1, 1]) {
        const tusk = pivot(p.head, s * 0.34, -0.44, -0.46);
        tusk.rotation.x = forest ? 0.9 : 0.55;
        box(tusk, 0.14, 0.14, forest ? 0.75 : 0.6, 0xfff8e1, 0, 0, -0.28, 0.45);
        const tip = pivot(tusk, 0, 0, forest ? -0.62 : -0.55);
        tip.rotation.x = -0.6;
        box(tip, 0.11, 0.11, 0.35, 0xfffde7, 0, 0, -0.14, 0.45);
      }
      p.animate = (t) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.14 - (i ? 0.16 : -0.05)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.25 + Math.sin(t * 2) * 0.2)));
      };
    },
  });
  if (forest) g.scale.setScalar(0.82);
  return g;
}

function blackRhino() {
  const skin = 0x7a736b;
  const dark = 0x625c55;
  return quad({
    body: { w: 1.5, h: 1.2, d: 2.2, y: 1.34, color: skin, chest: 0x80786f },
    head: { w: 0.8, h: 0.74, d: 1.1, y: 1.28, z: -1.55, color: skin },
    legs: { w: 0.46, h: 0.86, x: 0.45, zf: -0.64, zb: 0.64, color: skin, foot: dark, toes: 0xd7ccc8, hoof: true },
    tail: { seg: 2, w: 0.08, len: 0.5, y: 1.62, color: skin, tip: 0x3e3a36, angle: 1.0 },
    eyeSize: 0.09,
    walkSpeed: 6.5,
    extras(p) {
      p.head.rotation.x = 0.24;
      box(p.head, 0.66, 0.6, 0.45, skin, 0, -0.08, -0.62, 0.45); // 口鼻
      spike(p.head, 0.22, 0.95, 0xbcae96, 0, 0.6, -0.62, -0.32); // 大角
      spike(p.head, 0.15, 0.48, 0xbcae96, 0, 0.42, -0.2, -0.18); // 細角
      box(p.head, 0.24, 0.18, 0.18, dark, 0, -0.3, -0.86, 0.45); // 尖上唇（黑犀牛特徵）
      for (const s of [-1, 1]) {
        box(p.head, 0.06, 0.1, 0.06, 0x3e3a36, s * 0.16, -0.05, -0.85, 0.45); // 鼻窿
        const ear = pivot(p.head, s * 0.32, 0.4, 0.42);
        box(ear, 0.16, 0.36, 0.12, skin, 0, 0.14, 0, 0.48);
        box(ear, 0.1, 0.1, 0.08, 0x3e3a36, 0, 0.33, 0, 0.45);
        p.ears.push(ear);
      }
      for (const z of [-0.5, 0.45]) box(p.root, 1.54, 0.12, 0.12, dark, 0, 1.36, z, 0.4); // 皮摺
      box(p.root, 1.2, 0.18, 1.6, 0x847b72, 0, 1.92, 0.1, 0.45); // 背脊
    },
  });
}

function redPanda() {
  const fur = 0xc4461a;
  const dark = 0x3e2723;
  return quad({
    body: { w: 0.6, h: 0.52, d: 1.0, y: 0.66, color: fur },
    head: { w: 0.7, h: 0.58, d: 0.54, y: 0.98, z: -0.66, color: 0xcf5321, cheek: WHITE },
    muzzle: { w: 0.3, h: 0.2, d: 0.14, y: -0.13, color: WHITE },
    nose: BLACK,
    legs: { w: 0.18, h: 0.46, x: 0.19, zf: -0.32, zb: 0.32, color: dark, foot: 0x261410 },
    tail: { seg: 6, w: 0.34, len: 1.2, y: 0.78, color: fur, rings: 0xeab088, tip: 0x5d2a12, angle: -0.15, taper: 0.04 },
    belly: dark,
    eyeSize: 0.12,
    walkSpeed: 10,
    extras(p) {
      for (const s of [-1, 1]) {
        box(p.head, 0.13, 0.08, 0.04, WHITE, s * 0.17, 0.19, -0.275, 0.45); // 白眉
        box(p.head, 0.07, 0.16, 0.04, 0x8d2b0b, s * 0.17, -0.12, -0.285, 0.45); // 淚痕
        const ear = pivot(p.head, s * 0.25, 0.32, 0.02);
        box(ear, 0.22, 0.22, 0.08, WHITE, 0, 0.07, 0, 0.5);
        box(ear, 0.13, 0.13, 0.06, 0x8d2b0b, 0, 0.06, -0.02, 0.45);
        p.ears.push(ear);
      }
    },
  });
}

function okapi() {
  const fur = 0x3b1f17;
  const cream = 0xe0cba8;
  return quad({
    body: { w: 0.8, h: 0.9, d: 1.5, y: 1.58, color: fur, rump: 0x452519 },
    head: { w: 0.44, h: 0.48, d: 0.62, y: 2.3, z: -1.1, color: fur },
    muzzle: { w: 0.36, h: 0.3, d: 0.3, y: -0.08, color: cream },
    nose: BLACK,
    neck: { w: 0.34, h: 0.4, len: 0.95, angle: 0.45, color: fur },
    legs: { w: 0.18, h: 1.2, x: 0.26, zf: -0.52, zb: 0.52, color: WHITE, thigh: fur, foot: 0x2b1811, hoof: true },
    tail: { seg: 2, w: 0.08, len: 0.5, y: 1.8, color: fur, tip: BLACK, angle: 1.0 },
    eyeSize: 0.1,
    walkSpeed: 7,
    extras(p) {
      // 腳上面嘅斑馬紋
      for (const leg of p.legs) for (let i = 0; i < 4; i++) box(leg.knee, 0.19, 0.06, 0.19, BLACK, 0, -0.08 - i * 0.12, 0, 0.3);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(p.root, 0.04, 0.07, 0.6, i % 2 ? WHITE : BLACK, s * 0.4, 1.5 - i * 0.14, 0.45, 0.3);
      box(p.head, 0.46, 0.24, 0.3, cream, 0, 0.1, -0.2, 0.42); // 淺色面頰
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.26, 0.24, 0.12);
        ear.rotation.z = s * -0.5;
        box(ear, 0.08, 0.38, 0.26, fur, 0, 0.14, 0, 0.42);
        box(ear, 0.04, 0.26, 0.18, cream, s * -0.02, 0.14, -0.02, 0.42);
        p.ears.push(ear);
        box(p.head, 0.07, 0.17, 0.07, fur, s * 0.1, 0.32, 0.08, 0.42); // 細角（ossicone）
        box(p.head, 0.08, 0.04, 0.08, 0x1a0f0b, s * 0.1, 0.42, 0.08, 0.42);
      }
    },
  });
}

// ================= 游水（新）：五節收窄、尾鰭有形 =================
// kind：'whale'（尾鰭橫、上下擺）、'shark'（尾鰭直、左右擺）
function swimmer2({ skin, belly, len, w, h, kind = 'whale', dorsal = 0, eyeSize, eyeZ = 0.55, pec = 0.55, extras }) {
  const g = new THREE.Group();
  const swimY = h / 2 + 0.35;
  const root = pivot(g, 0, swimY, 0);
  const whale = kind === 'whale';
  const L = [0.27, 0.22, 0.2, 0.17, 0.14]; // 每節佔幾長
  const W = [1, 1.0, 0.9, 0.68, 0.42];
  const Hh = [0.92, 1.0, 0.9, 0.7, 0.45];
  let parent = root;
  let z = -len / 2;
  const segs = [];
  L.forEach((f, i) => {
    const sl = len * f;
    const sp = pivot(parent, 0, 0, i ? len * L[i - 1] : z);
    // 每節長啲、疊入下一節，睇落似一條順滑嘅身（唔似毛蟲）
    box(sp, w * W[i], h * Hh[i], sl * 1.35, skin, 0, (i === 0 ? -h * 0.03 : 0), sl * 0.6, 0.36);
    box(sp, w * W[i] * 0.86, h * Hh[i] * 0.4, sl * 1.3, belly, 0, -h * Hh[i] * 0.31, sl * 0.6, 0.38);
    segs.push(sp);
    parent = sp;
  });
  const head = segs[0];
  sideEyes(head, w * 0.5 + 0.005, h * 0.06, len * L[0] * eyeZ, eyeSize ?? Math.max(0.08, w * 0.12));
  if (dorsal) {
    const d = pivot(segs[2], 0, h * 0.45, len * 0.05);
    d.rotation.x = 0.55;
    box(d, 0.08, h * dorsal, len * 0.09, skin, 0, h * dorsal * 0.45, 0, 0.3);
  }
  // 尾鰭
  const tail = pivot(segs[4], 0, 0, len * L[4]);
  if (whale) {
    for (const s of [-1, 1]) {
      const lobe = pivot(tail, s * 0.05, 0, 0.02);
      lobe.rotation.y = s * 0.55;
      box(lobe, w * 0.95, 0.07, len * 0.08, skin, s * w * 0.42, 0, len * 0.04, 0.42);
      box(lobe, w * 0.4, 0.06, len * 0.05, skin, s * w * 0.82, 0, len * 0.08, 0.42); // 尾尖向後
    }
  } else {
    const up = pivot(tail, 0, 0, 0);
    up.rotation.x = 0.85;
    box(up, 0.08, h * 1.25, len * 0.07, skin, 0, h * 0.6, 0, 0.3);
    const low = pivot(tail, 0, 0, 0);
    low.rotation.x = -0.8;
    box(low, 0.08, h * 0.7, len * 0.06, skin, 0, -h * 0.33, 0, 0.3);
  }
  // 胸鰭（向下向外）
  const fins = [-1, 1].map((s) => {
    const fp = pivot(segs[1], s * w * 0.46, -h * 0.28, len * 0.03);
    fp.rotation.z = s * -0.45;
    fp.rotation.y = s * -0.4;
    box(fp, w * pec, 0.06, len * 0.09, skin, s * w * pec * 0.48, 0, len * 0.03, 0.4);
    return { fp, s };
  });
  const parts = { g, root, segs, head, tail };
  extras?.(parts);
  g.userData.animate = (t, moving) => {
    const sp = 2.4 + moving * 2;
    const axis = whale ? 'x' : 'y';
    const a = whale ? 0.07 : 0.12;
    segs.forEach((sg, i) => i && (sg.rotation[axis] = Math.sin(t * sp - i * 0.7) * a * (0.6 + i * 0.35)));
    tail.rotation[axis] = Math.sin(t * sp - 3.6) * a * 2.6;
    fins.forEach(({ fp, s }) => (fp.rotation.x = Math.sin(t * 2 + s) * 0.2));
    root.position.y = swimY + Math.sin(t * 1.5) * 0.12;
    parts.animate?.(t, moving);
  };
  g.userData.height = swimY + h;
  g.userData.move = 'swim';
  return g;
}

function blueWhale() {
  return swimmer2({
    skin: 0x4c7396, belly: 0xb9c9d8, len: 5.8, w: 1.2, h: 1.0, dorsal: 0.22, pec: 0.85, eyeZ: 0.85,
    extras({ head, segs }) {
      for (let i = 0; i < 6; i++) box(head, 0.06, 0.03, 1.4, 0x93a9bd, -0.4 + i * 0.16, -0.48, 0.8, 0.3); // 喉嚨坑紋
      box(head, 1.1, 0.05, 0.05, 0x2f4a62, 0, -0.12, 0.02, 0.3); // 口
      for (const s of [-1, 1]) box(head, 0.14, 0.05, 0.1, 0x2f4a62, s * 0.14, 0.5, 0.45, 0.4); // 噴氣孔
      segs.forEach((sg, k) => { for (let i = 0; i < 3; i++) box(sg, 0.18, 0.02, 0.22, 0x6f8fab, ((i * 7 + k) % 5 - 2) * 0.17, 0.48 - k * 0.04, 0.2 + i * 0.25, 0.4); }); // 背上斑點
    },
  });
}

function vaquita() {
  return swimmer2({
    skin: 0x8f989f, belly: 0xe2e6e9, len: 1.7, w: 0.5, h: 0.48, dorsal: 0.6, eyeSize: 0.075, eyeZ: 0.6,
    extras({ head }) {
      for (const s of [-1, 1]) box(head, 0.02, 0.17, 0.2, 0x1d1d1d, s * 0.252, 0.04, 0.27, 0.4); // 招牌黑眼圈
      box(head, 0.32, 0.05, 0.05, 0x1d1d1d, 0, -0.09, 0.0, 0.3); // 黑嘴唇
      box(head, 0.2, 0.05, 0.04, 0xff8a80, 0, -0.14, 0.01, 0.3); // 笑口
    },
  });
}

function dugong() {
  return swimmer2({
    skin: 0x9b958e, belly: 0xc2bbb2, len: 2.6, w: 0.9, h: 0.78, eyeSize: 0.075, eyeZ: 0.5,
    extras({ head }) {
      const snout = pivot(head, 0, -0.16, -0.02);
      box(snout, 0.62, 0.42, 0.34, 0xb3aca2, 0, -0.1, -0.06, 0.48); // 向下彎嘅大鼻
      box(snout, 0.5, 0.12, 0.08, 0x8a837b, 0, -0.26, -0.22, 0.4);
      for (let i = 0; i < 6; i++) box(snout, 0.04, 0.04, 0.02, 0x5d5853, ((i % 3) - 1) * 0.14, -0.1 - Math.floor(i / 3) * 0.09, -0.24, 0.4); // 鬚
    },
  });
}

function hammerhead() {
  return swimmer2({
    skin: 0x7a8794, belly: 0xedf0f2, len: 2.8, w: 0.58, h: 0.58, kind: 'shark', dorsal: 1.1, eyeSize: 0.001, pec: 0.7,
    extras({ head }) {
      // 錘頭：兩邊伸出去，尾端有眼
      const hammer = pivot(head, 0, 0.04, 0.12);
      box(hammer, 1.55, 0.18, 0.42, 0x7a8794, 0, 0, 0, 0.42);
      box(hammer, 1.4, 0.08, 0.36, 0xedf0f2, 0, -0.08, 0.02, 0.42);
      sideEyes(hammer, 0.78, 0.02, 0, 0.11);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(head, 0.02, 0.22, 0.03, 0x5f6a74, s * 0.295, 0, 0.45 + i * 0.07, 0.3); // 鰓
      box(head, 0.3, 0.03, 0.03, 0x3d454d, 0, -0.18, 0.3, 0.3); // 口
    },
  });
}

function whaleShark() {
  return swimmer2({
    skin: 0x3d5a73, belly: 0xe6eaed, len: 4.4, w: 1.2, h: 0.8, kind: 'shark', dorsal: 0.8, eyeSize: 0.08, eyeZ: 0.5, pec: 0.8,
    extras({ head, segs }) {
      box(head, 1.25, 0.32, 0.36, 0x3d5a73, 0, -0.12, 0.05, 0.4); // 又闊又扁嘅頭
      box(head, 1.05, 0.05, 0.05, 0x22313f, 0, -0.22, -0.11, 0.3); // 大大個口
      segs.slice(0, 4).forEach((sg, k) => {
        for (let i = 0; i < 6; i++) box(sg, 0.12, 0.02, 0.12, WHITE, ((i % 3) - 1) * 0.28 + (k % 2) * 0.12, 0.4 - k * 0.04, 0.15 + Math.floor(i / 3) * 0.32, 0.4); // 白點
        for (const s of [-1, 1]) box(sg, 0.04, 0.03, 0.8, 0x56738c, s * 0.32, 0.39 - k * 0.04, 0.3, 0.3); // 背脊
      });
    },
  });
}

function manta() {
  const top = 0x22272d;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.95, 0);
  box(root, 1.0, 0.36, 1.2, top, 0, 0, 0, 0.45);
  box(root, 0.9, 0.1, 1.05, WHITE, 0, -0.17, 0, 0.42);
  for (const s of [-1, 1]) box(root, 0.36, 0.03, 0.4, 0xd6dbe0, s * 0.3, 0.18, -0.1, 0.4); // 背上白色膊頭斑
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.48, 0, 0);
    box(p, 1.05, 0.22, 1.0, top, s * 0.5, 0, 0.05, 0.45);
    box(p, 0.95, 0.06, 0.85, WHITE, s * 0.5, -0.12, 0.05, 0.42);
    const tip = pivot(p, s * 1.0, 0, 0.1);
    box(tip, 0.75, 0.14, 0.6, top, s * 0.35, 0, 0.12, 0.45);
    box(tip, 0.45, 0.08, 0.3, top, s * 0.85, 0, 0.3, 0.45); // 翼尖向後
    return { p, tip, s };
  });
  for (const s of [-1, 1]) {
    const horn = pivot(root, s * 0.34, 0, -0.62);
    horn.rotation.y = s * -0.15;
    box(horn, 0.16, 0.14, 0.42, top, 0, 0, -0.2, 0.45);
    box(horn, 0.14, 0.24, 0.1, top, 0, -0.08, -0.4, 0.45); // 頭鰭捲落
  }
  sideEyes(root, 0.5, 0.06, -0.45, 0.1);
  box(root, 0.55, 0.06, 0.05, 0x111111, 0, -0.06, -0.61, 0.3);
  for (let i = 0; i < 6; i++) box(root, 0.08, 0.02, 0.08, 0x37474f, ((i % 3) - 1) * 0.25, -0.225, -0.2 + Math.floor(i / 3) * 0.3, 0.4);
  const tail = pivot(root, 0, 0, 0.6);
  box(tail, 0.06, 0.06, 1.5, top, 0, 0, 0.75, 0.3);
  g.userData.animate = (t) => {
    wings.forEach(({ p, tip, s }) => {
      p.rotation.z = s * Math.sin(t * 2.4) * 0.38;
      tip.rotation.z = s * Math.sin(t * 2.4 - 0.7) * 0.35;
    });
    tail.rotation.y = Math.sin(t * 2) * 0.15;
    root.position.y = 0.95 + Math.sin(t * 2.4 - 1) * 0.12;
  };
  g.userData.height = 1.3;
  g.userData.move = 'swim';
  return g;
}

function seaTurtle() {
  const shell = 0x5a7a37;
  const scute = 0x8ea35a;
  const rim = 0x46632a;
  const skin = 0x8ba560;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.55, 0);
  box(root, 1.35, 0.2, 1.55, rim, 0, -0.02, 0, 0.45); // 殼邊
  box(root, 1.2, 0.3, 1.4, shell, 0, 0.14, 0, 0.45);
  box(root, 0.9, 0.24, 1.08, shell, 0, 0.36, 0, 0.48); // 圓頂
  // 殼花紋（中間一行 + 兩邊）
  for (let i = 0; i < 3; i++) box(root, 0.3, 0.04, 0.3, scute, 0, 0.49, -0.34 + i * 0.34, 0.45);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(root, 0.24, 0.04, 0.26, scute, s * 0.35, 0.37, -0.32 + i * 0.32, 0.45).rotation.z = s * 0.3;
  box(root, 1.1, 0.12, 1.3, 0xead9a6, 0, -0.14, 0, 0.42); // 肚殼
  const head = pivot(root, 0, 0.06, -0.8);
  box(head, 0.3, 0.26, 0.3, skin, 0, 0, 0.0, 0.45); // 頸
  box(head, 0.46, 0.38, 0.46, skin, 0, 0.04, -0.24, 0.45);
  box(head, 0.2, 0.12, 0.12, 0x5d6b3a, 0, -0.06, -0.49, 0.42); // 鳥咀咁嘅口
  sideFaceEyes(head, 0.17, 0.1, -0.36, 0.11, { turn: 0.5 });
  for (let i = 0; i < 4; i++) box(head, 0.1, 0.02, 0.1, 0x6b8a3a, ((i % 2) - 0.5) * 0.2, 0.235, -0.12 - Math.floor(i / 2) * 0.16, 0.42);
  const flippers = [[-1, -0.38, 1.1], [1, -0.38, 1.1], [-1, 0.52, 0.5], [1, 0.52, 0.5]].map(([s, z, len], i) => {
    const p = pivot(root, s * 0.62, -0.04, z);
    p.rotation.y = s * (i < 2 ? -0.35 : 0.5);
    box(p, len, 0.08, i < 2 ? 0.36 : 0.3, skin, s * len / 2, 0, 0, 0.45);
    if (i < 2) for (let k = 0; k < 3; k++) box(p, 0.12, 0.03, 0.12, 0x6b8a3a, s * (0.25 + k * 0.28), 0.05, 0, 0.42);
    return { p, s, i };
  });
  g.userData.animate = (t, moving) => {
    flippers.forEach(({ p, s, i }) => (p.rotation.z = s * Math.sin(t * 2.2 + (i < 2 ? 0 : 1.2)) * (0.3 + moving * 0.25)));
    head.rotation.y = Math.sin(t * 0.8) * 0.3;
    root.position.y = 0.55 + Math.sin(t * 1.5) * 0.08;
  };
  g.userData.height = 1.05;
  g.userData.move = 'swim';
  return g;
}

// ================= 雀（新）=================
// 身係企直咗少少嘅蛋形（心口 + 背 + 肚）、翼收埋喺身兩邊（幾層羽毛）、眼喺頭兩邊、唔同款嘅嘴
// beakType：'parrot'（大勾嘴）、'raptor'（鷹勾嘴）、'short'（短尖嘴）
function bird2(o) {
  const {
    body, belly = body, head: headColor = body, wing = body, wingTip = wing, wingMid = wing, tail: tailColor = wing, tailTip = tailColor,
    beak = 0x2b2b2b, beakLower = beak, beakType = 'parrot', face = null, crest = null, eyeRing = null, legColor = 0x6d6d6d,
    size = 1, tailLen = 0.7, chunky = false, flightless = false, upright = 0.35, eyeOpts, cheek = null, ruff = null,
  } = o;
  const g = new THREE.Group();
  const root = pivot(g);
  const bw = chunky ? 0.66 : 0.54;
  const legH = chunky ? 0.3 : 0.4;
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.13, legH + 0.04, 0.02);
    box(hip, 0.09, 0.12, 0.09, belly, 0, -0.02, 0, 0.4); // 腳毛
    box(hip, 0.06, legH, 0.06, legColor, 0, -legH / 2, 0, 0.3);
    for (const [tx, tz] of [[-0.05, -0.07], [0.05, -0.07], [0, 0.07]]) box(hip, 0.045, 0.04, 0.13, legColor, tx, -legH, tz, 0.3);
    return hip;
  });
  const bodyY = legH + (chunky ? 0.32 : 0.36);
  const torso = pivot(root, 0, bodyY, 0);
  torso.rotation.x = upright * 0.5; // 企直（心口向前、尾向下）
  box(torso, bw, chunky ? 0.66 : 0.62, 0.66, body, 0, 0, 0.04, 0.48);
  box(torso, bw * 0.78, chunky ? 0.46 : 0.42, 0.1, belly, 0, -0.06, -0.27, 0.5); // 心口
  box(torso, bw * 0.7, 0.2, 0.5, belly, 0, -0.3, 0.02, 0.48); // 肚
  const neckTop = new THREE.Vector3(0, 0.32, -0.12);
  const head = pivot(torso, neckTop.x, neckTop.y + 0.18, neckTop.z);
  head.rotation.x = -upright * 0.5; // 個頭擺返正
  if (ruff) box(head, 0.56, 0.2, 0.5, ruff, 0, -0.22, 0.06, 0.48); // 頸毛（鷹）
  box(head, 0.54, 0.5, 0.5, headColor, 0, 0, 0, 0.45);
  if (face) box(head, 0.4, 0.28, 0.06, face, 0, -0.02, -0.235, 0.45);
  if (cheek) for (const s of [-1, 1]) box(head, 0.06, 0.18, 0.2, cheek, s * 0.25, -0.04, -0.1, 0.45);
  if (eyeRing) for (const s of [-1, 1]) {
    const er = pivot(head, s * 0.2, 0.05, -0.16);
    er.rotation.y = s * -0.75;
    box(er, 0.17, 0.19, 0.03, eyeRing, 0, 0, 0, 0.42);
  }
  sideFaceEyes(head, 0.2, 0.06, -0.165, 0.11, { turn: 0.75, ...(eyeOpts || {}) });
  // 嘴
  const bk = pivot(head, 0, -0.04, -0.24);
  if (beakType === 'parrot') {
    box(bk, 0.2, 0.2, 0.16, beak, 0, 0.02, -0.05, 0.4);
    box(bk, 0.16, 0.16, 0.1, beak, 0, -0.08, -0.13, 0.4);
    box(bk, 0.1, 0.12, 0.06, beak, 0, -0.18, -0.15, 0.4); // 勾尖
    box(bk, 0.14, 0.08, 0.1, beakLower, 0, -0.13, -0.03, 0.4);
  } else if (beakType === 'raptor') {
    box(bk, 0.16, 0.16, 0.22, beak, 0, 0.02, -0.08, 0.4);
    box(bk, 0.12, 0.13, 0.1, beak, 0, -0.06, -0.2, 0.4);
    box(bk, 0.08, 0.1, 0.06, beak, 0, -0.14, -0.22, 0.4);
    box(bk, 0.13, 0.06, 0.12, beakLower, 0, -0.09, -0.06, 0.4);
  } else {
    box(bk, 0.13, 0.1, 0.2, beak, 0, 0, -0.08, 0.35);
    box(bk, 0.09, 0.07, 0.12, beak, 0, -0.01, -0.22, 0.35);
  }
  if (crest) for (let i = 0; i < 5; i++) {
    const c = box(head, 0.07, 0.34 - Math.abs(i - 2) * 0.06, 0.07, crest, (i - 2) * 0.08, 0.3, 0.12, 0.3);
    c.rotation.x = 0.75;
    c.rotation.z = (i - 2) * 0.16;
  }
  // 翼：收埋喺身兩邊（三層：肩、中、飛羽），飛嗰陣張開
  const wings = [-1, 1].map((s) => {
    const shoulder = pivot(torso, s * (bw / 2 - 0.01), 0.16, -0.08);
    box(shoulder, 0.08, 0.3, 0.5, wing, 0, -0.1, 0.12, 0.45);
    box(shoulder, 0.07, 0.22, 0.42, wingMid, s * 0.005, -0.27, 0.2, 0.42);
    const tip = pivot(shoulder, 0, -0.32, 0.36);
    box(tip, 0.06, 0.14, 0.38, wingTip, 0, -0.02, 0.14, 0.4);
    return { shoulder, tip, s };
  });
  // 尾：幾條羽毛
  const tail = pivot(torso, 0, -0.2, 0.36);
  tail.rotation.x = 0.55;
  const n = tailLen > 0.8 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2;
    const f = pivot(tail, k * 0.06, 0, 0);
    f.rotation.y = k * 0.1;
    const len = tailLen * (1 - Math.abs(k) * 0.12);
    box(f, 0.09, 0.04, len, tailColor, 0, 0, len / 2, 0.3);
    box(f, 0.09, 0.04, len * 0.28, tailTip, 0, 0.005, len * 0.88, 0.3);
  }
  g.scale.setScalar(size);
  g.userData.move = flightless ? 'walk' : 'fly';
  g.userData.animate = (t, moving) => {
    if (g.userData.flying) {
      legs.forEach((l) => (l.rotation.x = 1.1));
      torso.rotation.x = 0.15;
      head.rotation.x = -0.15;
      const f = Math.sin(t * 12);
      wings.forEach(({ shoulder, tip, s }) => {
        shoulder.rotation.z = s * (1.25 + f * 0.7); // 張開拍
        tip.rotation.z = s * f * 0.4;
      });
      tail.rotation.x = 0.2;
      return;
    }
    torso.rotation.x = upright * 0.5 + Math.sin(t * 2) * 0.03;
    head.rotation.x = -upright * 0.5;
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + i * PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.05 * moving;
    const flap = Math.max(0, Math.sin(t * 1.1)) > 0.9 ? Math.abs(Math.sin(t * 22)) * 1.2 : 0; // 間中拍下翼
    wings.forEach(({ shoulder, tip, s }) => {
      shoulder.rotation.z = s * flap;
      tip.rotation.z = 0;
    });
    head.rotation.y = Math.sin(t * 1.7) * 0.45 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.9) * 0.15; // 側頭睇你
    tail.rotation.y = Math.sin(t * 2.5) * 0.06;
  };
  g.userData.height = 1.6 * size;
  return g;
}

export const ANIMALS_20 = {
  'Giant Panda': panda,
  'African Savanna Elephant': () => elephant(false),
  'African Forest Elephant': () => elephant(true),
  'Black Rhinoceros': blackRhino,
  'Red Panda': redPanda,
  Okapi: okapi,

  'Manta Ray': manta,
  'Scalloped Hammerhead Shark': hammerhead,
  'Blue Whale': blueWhale,
  Vaquita: vaquita,
  'Sea Turtle': seaTurtle,
  'Whale Shark': whaleShark,
  Dugong: dugong,

  "Spix's Macaw": () => bird2({
    body: 0x3a7bd5, belly: 0x5a94e0, head: 0xa9c4e8, face: 0x6f7b88, wing: 0x2c63b8, wingMid: 0x2558a8, wingTip: 0x1e4a8f,
    tail: 0x2c63b8, tailTip: 0x1e4a8f, beak: 0x2b2b2b, tailLen: 1.0, upright: 0.45,
  }),
  'Philippine Eagle': () => bird2({
    body: 0x6b4a2e, belly: 0xf5f0e4, head: 0xe9dcc0, ruff: 0xd8c39a, wing: 0x5a3d24, wingMid: 0x4d3420, wingTip: 0x3e2a18,
    tail: 0x5a3d24, tailTip: 0x3e2a18, beak: 0x5f7184, beakLower: 0x6f8296, beakType: 'raptor', crest: 0xc8a876,
    size: 1.5, tailLen: 0.55, legColor: 0xf2c94c, upright: 0.55, eyeOpts: { iris: 0x90caf9 },
  }),
  Kakapo: () => bird2({
    body: 0x7b9a35, belly: 0xc2b85a, head: 0x9aa94c, face: 0xd1c27a, cheek: 0xd1c27a, wing: 0x6a8a2c, wingMid: 0x5f7d27, wingTip: 0x4e6a1f,
    tail: 0x6a8a2c, beak: 0xe0d6bd, beakType: 'parrot', chunky: true, flightless: true, size: 1.15, tailLen: 0.32, legColor: 0x9e9e9e, upright: 0.1,
  }),
  'Hyacinth Macaw': () => bird2({
    body: 0x2547b0, belly: 0x2c52c0, wing: 0x1e3c99, wingMid: 0x1a3588, wingTip: 0x172f7a, tail: 0x1e3c99, tailTip: 0x172f7a,
    beak: 0x1f1f1f, beakLower: 0xffd600, eyeRing: 0xffd600, size: 1.3, tailLen: 1.15, legColor: 0x424242, upright: 0.5,
  }),
  'Sun Conure': () => bird2({
    body: 0xffc107, belly: 0xff9800, head: 0xffb300, face: 0xff6d00, wing: 0xffb300, wingMid: 0x8bc34a, wingTip: 0x1e88e5,
    tail: 0x8bc34a, tailTip: 0x1e88e5, beak: 0x2b2b2b, size: 0.85, tailLen: 0.65, upright: 0.4,
  }),
  'California Condor': () => bird2({
    body: 0x1b1b1b, belly: 0x262626, head: 0xf08a6a, face: 0xe57373, ruff: 0x111111, wing: 0x151515, wingMid: 0xf5f5f5, wingTip: 0x151515,
    tail: 0x151515, beak: 0xe8d8b8, beakType: 'raptor', size: 1.55, tailLen: 0.45, legColor: 0x9e9e9e, upright: 0.5,
  }),
  'Bali Myna': () => bird2({
    body: WHITE, belly: 0xffffff, head: WHITE, wing: 0xf0f0ea, wingMid: 0xf0f0ea, wingTip: 0x1d1d1d, tail: 0xf0f0ea, tailTip: 0x1d1d1d,
    beak: 0xf9d55a, beakType: 'short', eyeRing: 0x1e88e5, crest: 0xffffff, size: 0.8, tailLen: 0.5, legColor: 0x90a4ae, upright: 0.4,
  }),
};
