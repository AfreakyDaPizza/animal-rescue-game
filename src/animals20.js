// 頭 20 隻動物（Biome 1–3）第二版嘅共用 builder（2026-11 Issue #18 第三版搬咗去 animals20v3.js）
// 呢度淨低：beast／swimmer／bird（animals30、fusePets、rodeoModels 用）、elephant（Octophant 用）、sleek 順滑游水身（worstPets、animals20v3 用）
// 方塊（Roblox）風格，但係大頭、大眼（有眼白同反光）、腳掌、花紋、羽毛層次、一節節識擺嘅身
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, pivot, cuteEyes, spike, slab, ball, material, BLACK, WHITE } from './modelKit.js';

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

// o（Octophant 用）：skin／dark／pinkIn／toes／tuskColor／tusk（象牙長度倍數）／eyeSize／eyeOpts／more(p, { trunk, ears })／animate(t, moving)
export function elephant(forest, o = {}) {
  const skin = o.skin ?? (forest ? 0x6f6a65 : 0x9a948c);
  const dark = o.dark ?? (forest ? 0x5b5651 : 0x847e77);
  const pinkIn = o.pinkIn ?? 0xcf9f98;
  const tuskK = o.tusk ?? 1;
  const g = quad({
    body: { w: 2.0, h: 1.75, d: 2.6, y: 2.2, color: skin },
    head: { w: 1.35, h: 1.3, d: 1.1, y: 2.7, z: -1.62, color: skin },
    legs: { w: 0.62, h: 1.45, x: 0.6, zf: -0.82, zb: 0.82, color: skin, foot: dark, toes: o.toes ?? 0xf1e8d8 },
    tail: { seg: 3, w: 0.1, len: 0.8, y: 2.45, color: skin, tip: o.tailTip ?? 0x3e3a36, angle: 1.0 },
    eyeSize: o.eyeSize ?? 0.12,
    eyeOpts: o.eyeOpts,
    eyes: o.eyes,
    walkSpeed: 5.5,
    swing: 0.32,
    extras(p) {
      box(p.head, 1.1, 0.4, 0.8, skin, 0, 0.62, 0.08, 0.5); // 額頭（兩嚿）
      for (const y of [1.7, 2.05, 2.4]) box(p.root, 2.04, 0.04, 1.6, dark, 0, y, 0.1, 0.3); // 皮膚皺紋
      // 大耳仔：彎彎有形嘅一大塊（草原象似非洲地圖、下面有尖耳垂；森林象細啲、圓啲）
      // 一層層：皮 → 粉紅色耳窩（向外、向前，有幾條血管紋）→ 上邊摺返過嚟嘅耳邊
      const outline = forest
        ? [[0.05, 0.12], [-0.35, 0.34], [-0.75, 0.32], [-1.0, 0.02], [-1.02, -0.42], [-0.82, -0.8], [-0.48, -0.96], [-0.22, -0.78], [-0.06, -0.42]]
        : [[0.05, 0.16], [-0.35, 0.44], [-0.9, 0.48], [-1.3, 0.22], [-1.44, -0.3], [-1.26, -0.8], [-0.96, -1.12], [-0.62, -1.52], [-0.38, -1.46], [-0.3, -1.0], [-0.12, -0.56], [0.05, -0.26]];
      const L = forest ? 1.0 : 1.44;
      // 向後越嚟越向外翻，上下兩邊微微向外彎（粉紅嗰面似個淺碟）
      const bend = (x, y) => 0.2 * Math.max(0, -x / L) ** 1.6 * L + 0.1 * ((y + L * 0.3) / L) ** 2;
      const shrink = (k, cx, cy) => outline.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
      const cx = -L * 0.5;
      const cy = -L * 0.3;
      const kk = forest ? 'ef' : 'es';
      const rim = [...outline.slice(0, 5).map(([x, y]) => [x, y]), ...outline.slice(0, 5).reverse().map(([x, y]) => [x * 0.9 + cx * 0.1, y - 0.16])];
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.62, 0.32, 0.05);
        ear.scale.x = s;
        slab(ear, outline, 0.07, skin, { plane: 'side', key: `${kk}-ear`, bevel: 0.035, bend });
        slab(ear, shrink(0.78, cx, cy), 0.03, pinkIn, { plane: 'side', key: `${kk}-ear-in`, bevel: 0.02, bend, x: 0.085 });
        slab(ear, rim, 0.05, o.rim ?? dark, { plane: 'side', key: `${kk}-ear-rim`, bevel: 0.025, bend: (x, y) => bend(x, y) + 0.02, x: 0.09 }); // 向前摺嘅耳邊
        for (const [x1, y1, rot, len] of [[-0.3, -0.25, -0.5, 0.55], [-0.45, -0.5, -0.9, 0.5], [-0.35, 0.05, -0.15, 0.6]]) {
          const vein = box(ear, 0.03, 0.035, len * L * 0.7, skin, bend(x1 * L, y1 * L) + 0.12, y1 * L, -x1 * L, 0.4); // 血管紋
          vein.rotation.x = rot;
        }
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
        box(tusk, 0.14, 0.14, (forest ? 0.75 : 0.6) * tuskK, o.tuskColor ?? 0xfff8e1, 0, 0, -0.28 * tuskK, 0.45);
        const tip = pivot(tusk, 0, 0, (forest ? -0.62 : -0.55) * tuskK);
        tip.rotation.x = -0.6;
        box(tip, 0.11, 0.11, 0.35 * tuskK, o.tuskColor ?? 0xfffde7, 0, 0, -0.14 * tuskK, 0.45);
      }
      o.more?.(p, { trunk, ears });
      p.animate = (t, moving) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.14 - (i ? 0.16 : -0.05)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.5 + Math.sin(t * 2) * 0.2))); // 耳向外打開，撥下撥下
        o.animate?.(t, moving);
      };
    },
  });
  if (forest) g.scale.setScalar(0.82);
  return g;
}

// ================= 順滑游水身（藍鯨、鯨鯊、錘頭鯊）=================
// 成條身係一整舊連住嘅形狀（由鼻尖到尾柄一圈圈連埋，冇一節節嘅接口），游水時成條身好似波浪咁彎
// prof(u) → [闊, 高, 上下位]（u：0 = 鼻尖，1 = 尾柄）；身上嘅花紋（點、坑紋、鰓）都會跟住身一齊彎
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const noseIn = (u, a) => Math.sqrt(Math.max(0, 1 - (1 - Math.min(u / a, 1)) ** 2)); // 頭：圓圓咁由 0 去到 1
const tailOut = (u, b, tip) => (u < b ? 1 : tip + (1 - tip) * (0.5 + 0.5 * Math.cos((PI * (u - b)) / (1 - b)))); // 尾：順滑收窄
const sePow = (v, n) => Math.sign(v) * Math.abs(v) ** (2 / n);
const sleekMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
const dotGeo = new THREE.SphereGeometry(1, 8, 5);
const BEND_N = 64; // 每格畫面計 65 個彎位，之後每粒點查表

function sleek({ skin, belly, len, w, h, kind = 'whale', prof, n = 2.4, belt = -0.2, extras, rings = 34, around = 24, glow = null }) {
  const g = new THREE.Group();
  const swimY = h / 2 + 0.35;
  const root = pivot(g, 0, swimY, 0);
  const whale = kind === 'whale';
  const z0 = -len / 2;
  const zAt = (u) => z0 + u * len;
  // 身表面一點（ang：π/2 = 背脊，-π/2 = 肚，0 = 右邊）；lift = 浮出表面幾多；n = 嗰度向外嘅方向
  const surf = (u, ang, lift = 0) => {
    const [ws, hs, yo] = prof(u);
    const rw = (w / 2) * ws + lift;
    const rh = (h / 2) * hs + lift;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const k = (2 * (n - 1)) / n;
    const nrm = new THREE.Vector3((Math.sign(c) * Math.abs(c) ** k) / Math.max(rw, 1e-3), (Math.sign(s) * Math.abs(s) ** k) / Math.max(rh, 1e-3), 0).normalize();
    return { p: new THREE.Vector3(sePow(c, n) * rw, sePow(s, n) * rh + (yo * h) / 2, zAt(u)), n: nrm };
  };
  // ---- 身：一圈圈連住（頭尾密啲），背深色、肚淺色，中間慢慢轉色 ----
  const pos = [];
  const col = [];
  const idx = [];
  const cS = new THREE.Color(skin);
  const cB = new THREE.Color(belly);
  const c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const u = (1 - Math.cos((PI * i) / rings)) / 2;
    for (let j = 0; j < around; j++) {
      const ang = (j / around) * PI * 2;
      const { p } = surf(u, ang);
      pos.push(p.x, p.y, p.z);
      c.copy(cB).lerp(cS, smooth01(belt - 0.12, belt + 0.12, Math.sin(ang)));
      col.push(c.r, c.g, c.b);
    }
  }
  const yEnd = (prof(1)[2] * h) / 2;
  const end = pos.length / 3;
  pos.push(0, yEnd, z0 + len);
  col.push(cS.r, cS.g, cS.b);
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * around + j;
      const b = i * around + ((j + 1) % around);
      idx.push(a, b, a + around, b, b + around, a + around);
    }
  }
  for (let j = 0; j < around; j++) idx.push(rings * around + j, rings * around + ((j + 1) % around), end);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, sleekMat);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  // ---- 貼喺身上嘅花紋：一粒粒拉扁嘅波波（同色嘅會焊埋一舊）----
  const decals = new Map();
  const addDecal = (color, m) => {
    if (!decals.has(color)) decals.set(color, []);
    decals.get(color).push(dotGeo.clone().applyMatrix4(m));
  };
  const M = new THREE.Matrix4();
  // sx = 沿住身嘅圈、sy = 厚度、sz = 沿住身長；rot = 喺表面上轉幾多
  const dot = (u, ang, sx, sy, sz, color, lift = 0, rot = 0) => {
    const { p, n: N } = surf(u, ang, lift);
    const B = new THREE.Vector3().crossVectors(N, new THREE.Vector3(0, 0, 1)).normalize();
    const T = new THREE.Vector3().crossVectors(B, N).normalize();
    if (rot) {
      B.applyAxisAngle(N, rot);
      T.applyAxisAngle(N, rot);
    }
    addDecal(color, M.makeBasis(B.multiplyScalar(sx), N.clone().multiplyScalar(sy), T.multiplyScalar(sz)).setPosition(p));
  };
  const blob = (x, y, z, sx, sy, sz, color) => addDecal(color, M.makeScale(sx, sy, sz).setPosition(x, y, z));

  // ---- 轉軸：鰭、錘頭等硬嘢跟住呢幾點郁 ----
  const segU = [0, 0.25, 0.5, 0.72, 0.88];
  const segs = segU.map((u) => pivot(root, 0, 0, zAt(u)));
  const head = segs[0];
  const tail = pivot(root, 0, yEnd, z0 + len);
  const seg = (u) => {
    let k = 0;
    segU.forEach((su, i) => u >= su && (k = i));
    return [segs[k], zAt(u) - zAt(segU[k])];
  };
  // 鰭：喺身表面 (u, ang) 插一塊有形狀嘅鰭；mirror = 左右各一塊
  const fin = (u, ang, pts, { plane = 'side', depth = 0.06, key, mirror = false, rot = [0, 0, 0], color = skin, inset = 0.03 } = {}) => {
    const [p, lz] = seg(u);
    return (mirror ? [-1, 1] : [1]).map((s) => {
      const { p: q } = surf(u, s < 0 ? PI - ang : ang, -inset);
      const fp = pivot(p, q.x, q.y, lz);
      fp.rotation.set(rot[0], s * rot[1], s * rot[2]);
      fp.scale.x = s;
      slab(fp, pts, depth, color, { plane, key, bevel: depth * 0.4 });
      return { fp, s };
    });
  };
  const parts = { g, root, segs, head, tail, surf, dot, blob, seg, fin, len, w, h };
  const fins = extras?.(parts) || []; // extras 回傳胸鰭，游水時撥下撥下
  const flex = [body];
  for (const [color, list] of decals) {
    const m = new THREE.Mesh(mergeGeometries(list), glow?.[color] ? material(color, { emissive: color, emissiveIntensity: glow[color] }) : material(color)); // glow：呢隻色嘅花紋會發光
    m.castShadow = true;
    root.add(m);
    flex.push(m);
  }
  // 每粒點喺身邊個位（查表用）
  const bases = flex.map((m) => {
    const attr = m.geometry.attributes.position;
    const base = Float32Array.from(attr.array);
    const at = new Float32Array(attr.count);
    for (let i = 0; i < attr.count; i++) at[i] = Math.min(BEND_N, Math.max(0, ((base[i * 3 + 2] - z0) / len) * BEND_N));
    m.geometry.computeBoundingSphere();
    m.geometry.boundingSphere.radius *= 1.2;
    return { attr, base, at };
  });

  const ax = whale ? 1 : 0; // 鯨上下擺、鯊左右擺
  const amp = len * (whale ? 0.03 : 0.045);
  const table = new Float32Array(BEND_N + 2);
  let ph = 0;
  const bendAt = (u) => amp * (smooth01(0.12, 1, u) ** 1.3 * Math.sin(ph - u * 3.2) - 0.12 * (1 - u) * Math.sin(ph + 0.6));
  const place = (p, u, y0) => {
    const off = bendAt(u);
    const sl = Math.atan((bendAt(u + 0.01) - off) / (0.01 * len));
    if (whale) {
      p.position.y = y0 + off;
      p.rotation.x = -sl;
    } else {
      p.position.x = off;
      p.rotation.y = sl;
    }
    return sl;
  };
  g.userData.animate = (t, moving) => {
    ph = t * (2.4 + moving * 2);
    for (let i = 0; i <= BEND_N + 1; i++) table[i] = bendAt(i / BEND_N);
    for (const { attr, base, at } of bases) {
      const a = attr.array;
      for (let i = 0; i < at.length; i++) {
        const f = at[i];
        const k = f | 0;
        a[i * 3 + ax] = base[i * 3 + ax] + table[k] + (table[k + 1] - table[k]) * (f - k);
      }
      attr.needsUpdate = true;
    }
    segU.forEach((u, i) => place(segs[i], u, 0));
    place(tail, 1, yEnd);
    const wag = Math.sin(ph - 3.6) * 0.22;
    if (whale) tail.rotation.x -= wag;
    else tail.rotation.y += wag;
    fins.forEach(({ fp, s }) => (fp.rotation.x = Math.sin(t * 2 + s) * 0.18));
    root.position.y = swimY + Math.sin(t * 1.5) * 0.12;
    parts.animate?.(t, moving);
  };
  g.userData.height = swimY + h;
  g.userData.move = 'swim';
  return g;
}

// 細細嘅隨機數（每隻都一樣，花紋唔會每次變）
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// 側面嘅圓眼（眼白 + 眼珠 + 反光），貼喺順滑身上
function sleekEyes(dot, u, ang, size) {
  for (const a of [ang, PI - ang]) {
    dot(u, a, size, size * 0.3, size * 1.2, 0xffffff, -size * 0.12);
    dot(u - size * 0.01, a, size * 0.62, size * 0.3, size * 0.72, BLACK, size * 0.05);
    dot(u - size * 0.03, a + (a < PI / 2 ? 1 : -1) * size * 0.4, size * 0.2, size * 0.2, size * 0.24, 0xffffff, size * 0.15);
  }
}

// 俾 worstPets.js（白鯨）用：順滑身 builder 同埋形狀小工具
export { sleek, sleekEyes, noseIn, tailOut, smooth01, seeded };
