// 💪 Gym 動作（小朋友 2026-10-18：「gym 要有動畫，好似攀石、舉重同其他」）
// 第三身：公仔做動作（衝刺、彈床、臥推、攀石、打沙包、划艇）—— 2026-10-18 改做 Minecraft 款（手腳硬直、鐘擺咁擺）
// 第一身：鏡頭輕輕跟住動作郁（唔好太勁，唔好暈）
// 所有 Gym 座標都係「設計座標」（gym.js），用 gymToWorld 轉去世界；面向 = 設計座標嘅 yaw + GYM_TURN
// 公仔：面向 -z，腳喺 (0,0,0)；手腳 rotation.x 正數 = 向前（面嗰邊）；avatar.g.rotation.order = 'YXZ'

import * as THREE from 'three';
import { GYM_TURN, gymToWorld, gymToLocal } from './labShape.js';

// ---- 臥推（Brain Bench）：公仔瞓喺櫈面，對手一路推個腦槓鈴 ----
// φ：對手向兩邊打開幾多（0 = 打直推高，大 = 落到心口）
export const BENCH_POSE = { lieY: 1.25, reach: 0.82, phiUp: 0.15, phiDown: 1.2, feetDz: 0.7 };
export const benchPhi = (lift) => BENCH_POSE.phiDown + (BENCH_POSE.phiUp - BENCH_POSE.phiDown) * lift;
export const benchBarY = (lift) => BENCH_POSE.lieY + BENCH_POSE.reach * Math.cos(benchPhi(lift)) + 0.04;

// ---- 划艇（Rowing Machine of Wisdom）：drive = 0（向前縮埋）→ 1（向後拉盡）----
export const ROW_POSE = { seatTop: 0.72, catchDz: -0.35, finishDz: 0.4, footDz: -1.15, footY: 0.35 };
export const rowSeatDz = (drive) => ROW_POSE.catchDz + (ROW_POSE.finishDz - ROW_POSE.catchDz) * drive;

// ---- 沙包：出拳伸幾盡（0 = 防守，1 = 打盡）----
export const punchReach = (t) => (t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.2));

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const v3 = new THREE.Vector3();

function place(avatar, lx, y, lz, localYaw) {
  const w = gymToWorld(lx, lz);
  avatar.g.position.set(w.x, y, w.z);
  avatar.g.rotation.set(0, localYaw + GYM_TURN, 0, 'YXZ');
}
const local = (eye) => gymToLocal(eye.position.x, eye.position.z);


// 回傳 true = 已經擺好姿勢（thirdPerson.js 唔使再做行路動畫）
export function poseGym(tp, st, { feetY, dt, time }) {
  const { avatar, eye } = tp;
  const [L, R] = avatar.legs;
  const [AL, AR] = avatar.arms;
  avatar.head.rotation.set(0, 0, 0);
  for (const limb of [L, R, AL, AR]) limb.rotation.set(0, 0, 0);
  const me = local(eye);

  if (st.kind === 'treadmill') {
    // ⚡ 衝刺（Minecraft 款）：手腳硬直大力擺、身少少向前，鎖住向住跑步機前面
    tp.phase += dt * 14;
    const s = Math.sin(tp.phase);
    place(avatar, st.x, feetY + Math.abs(Math.cos(tp.phase)) * 0.06, THREE.MathUtils.clamp(me.z, st.z - 1.6, st.z + 1.8), 0);
    avatar.g.rotation.x = -0.15;
    L.rotation.x = s * 1.0;
    R.rotation.x = -s * 1.0;
    AL.rotation.x = -s * 1.0;
    AR.rotation.x = s * 1.0;
    AL.rotation.z = -0.04;
    AR.rotation.z = 0.04;
    avatar.head.rotation.x = Math.sin(tp.phase * 2) * 0.04;
    return true;
  }

  if (st.kind === 'trampoline') {
    // 🦘 彈床（Minecraft 款）：升嘅時候雙手打直舉高、跌嘅時候張開手；雙腳併埋
    const T = tp.tramp || (tp.tramp = { prevH: 0, k: 0 });
    const h = feetY - st.top;
    const up = h >= T.prevH;
    T.prevH = h;
    const inAir = h > 0.1;
    // up：舉高（π），跌：張開（打側）；落地：手垂低
    const target = !inAir ? 0 : up ? 1 : 0.5;
    T.k += (target - T.k) * Math.min(1, dt * 10);
    avatar.g.position.set(eye.position.x, feetY, eye.position.z);
    avatar.g.rotation.set(0, eye.rotation.y, 0, 'YXZ');
    const raise = Math.min(1, T.k * 2); // 0 → 1 舉手
    const spread = Math.max(0, 1 - Math.abs(T.k - 0.5) * 2); // 跌落嚟張開
    // 雙手喺身兩邊打圈（由後面望最清楚）：升 = 打直舉高、跌 = 打側張開、落地 = 垂低
    const armA = 0.1 + raise * ((1 - spread) * (Math.PI - 0.1) + spread * 1.25);
    AL.rotation.z = -armA;
    AR.rotation.z = armA;
    L.rotation.z = -0.04;
    R.rotation.z = 0.04;
    avatar.head.rotation.x = up && inAir ? -0.15 : 0.05;
    return true;
  }

  if (st.kind === 'bench') {
    // 🧠 臥推：瞓喺櫈面（頭向槓鈴架），對手推個腦槓鈴，對腳踩喺地兩邊
    const lift = st.lift || 0;
    place(avatar, st.x, BENCH_POSE.lieY, st.z + BENCH_POSE.feetDz, Math.PI);
    avatar.g.rotation.x = Math.PI / 2;
    const phi = benchPhi(lift);
    AL.rotation.set(Math.PI / 2, 0, -phi);
    AR.rotation.set(Math.PI / 2, 0, phi);
    L.rotation.set(-1.3, 0, -0.6);
    R.rotation.set(-1.3, 0, 0.6);
    avatar.head.rotation.x = -0.15 * lift; // 推嘅時候個頭望住槓鈴
    return true;
  }

  if (st.kind === 'wall') {
    // 🧗 攀石：面向牆，手腳交替爬；爬到頂揮拳慶祝，跟住滑返落嚟
    const lz = THREE.MathUtils.clamp(me.z, st.z - st.halfLen + 0.8, st.z + st.halfLen - 0.8);
    place(avatar, st.faceX + 0.78, st.climb, lz, Math.PI / 2); // 離牆遠少少：手同身唔好插入牆／攀石點
    avatar.g.rotation.x = -0.08;
    avatar.head.rotation.x = -0.35; // 望上
    if (st.mode === 'top') {
      const k = Math.min(1, st.modeT / 0.25);
      AR.rotation.x = Math.PI;
      AR.rotation.z = Math.sin(st.modeT * 14) * 0.25 * k; // 揮拳
      AL.rotation.x = Math.PI * 0.86;
      L.rotation.x = 0.25;
      R.rotation.x = 0.05;
      avatar.head.rotation.x = -0.5;
    } else if (st.mode === 'slide') {
      AL.rotation.x = AR.rotation.x = Math.PI * 0.88;
      AL.rotation.z = -0.25;
      AR.rotation.z = 0.25;
      L.rotation.x = R.rotation.x = 0.2;
    } else {
      const ph = st.climb * 5 + time * 0.6;
      const s = Math.sin(ph);
      AL.rotation.x = Math.PI * 0.86 + s * 0.22; // Minecraft 款：硬直手一上一落
      AR.rotation.x = Math.PI * 0.86 - s * 0.22;
      AL.rotation.z = -0.15;
      AR.rotation.z = 0.15;
      L.rotation.x = 0.3 - s * 0.3; // 左手高嗰陣右腳踩高（硬直腳：唔好踢入牆）
      R.rotation.x = 0.3 + s * 0.3;
      L.rotation.z = -0.15;
      R.rotation.z = 0.15;
      avatar.g.position.y += Math.abs(Math.cos(ph)) * 0.05;
    }
    return true;
  }

  if (st.kind === 'bag') {
    // 🥊 打沙包：馬步、雙手防守，左右直拳輪流打
    place(avatar, st.x, 0, st.standZ, Math.PI);
    const e = punchReach(st.punchT ?? 1);
    const hand = st.hand ? AR : AL;
    const other = st.hand ? AL : AR;
    const side = st.hand ? 1 : -1;
    for (const a of [AL, AR]) a.rotation.x = 1.95;
    AL.rotation.z = 0.25;
    AR.rotation.z = -0.25;
    hand.rotation.x = lerp(1.95, Math.PI / 2, e);
    hand.rotation.z = side * -0.25 * (1 - e) + side * -0.12 * e;
    other.rotation.x = 2.05;
    avatar.g.rotation.y += side * 0.28 * e; // 轉腰出拳
    L.rotation.x = 0.35;
    R.rotation.x = -0.3;
    L.rotation.z = -0.12;
    R.rotation.z = 0.12;
    avatar.g.position.y = Math.abs(Math.sin(time * 7)) * 0.04; // 輕輕跳
    avatar.head.rotation.x = 0.05;
    return true;
  }

  if (st.kind === 'row') {
    // 🚣 划艇：縮埋（膝頭高、手向前）→ 推腳、身向後、手拉到肚
    const d = st.drive || 0;
    const dz = rowSeatDz(d);
    place(avatar, st.x, ROW_POSE.seatTop - 0.9, st.z + dz, 0);
    avatar.g.rotation.x = lerp(-0.35, 0.3, d);
    // 對腳踩住腳踏：櫈仔近 = 腳斜落、櫈仔遠 = 腳伸直
    const reach = dz - ROW_POSE.footDz;
    L.rotation.x = R.rotation.x = Math.min(1.45, Math.atan2(reach, ROW_POSE.seatTop - ROW_POSE.footY));
    L.rotation.z = -0.08;
    R.rotation.z = 0.08;
    const armK = smooth(Math.max(0, (d - 0.35) / 0.65)); // 腳推完先拉手
    AL.rotation.x = AR.rotation.x = lerp(1.4, 0.55, armK);
    AL.rotation.z = -0.1;
    AR.rotation.z = 0.1;
    return true;
  }
  return false;
}

// 第一身：每部機嘅鏡頭小動作；回傳要畫嘅鏡頭（view），冇就 null（照用 eye）
export function gymFirstPerson(tp, st, { time }) {
  const { eye, view } = tp;
  const copy = () => {
    view.position.copy(eye.position);
    view.quaternion.copy(eye.quaternion);
    view.fov = eye.fov;
    view.aspect = eye.aspect;
  };
  if (st.kind === 'treadmill') {
    copy();
    view.position.y += Math.abs(Math.sin(time * 10)) * 0.05;
  } else if (st.kind === 'bench') {
    // 瞓低望上：睇住個腦槓鈴上上落落
    const head = gymToWorld(st.x, st.z + BENCH_POSE.feetDz - 2.15);
    const bar = gymToWorld(st.x, st.z - 1.05);
    const headDir = gymToWorld(st.x, st.z - 10);
    view.position.set(head.x, BENCH_POSE.lieY + 0.38, head.z);
    view.up.set(headDir.x - head.x, 0, headDir.z - head.z).normalize();
    view.lookAt(bar.x, benchBarY(st.lift || 0) + 0.15, bar.z); // 望住個槓鈴
    view.up.set(0, 1, 0);
    view.fov = eye.fov;
    view.aspect = eye.aspect;
  } else if (st.kind === 'wall') {
    copy();
    view.rotateZ(Math.sin(time * 3) * 0.03);
    view.position.y += Math.sin(time * 6) * 0.03;
  } else if (st.kind === 'bag') {
    copy();
    const e = punchReach(st.punchT ?? 1);
    eye.getWorldDirection(v3);
    view.position.addScaledVector(v3, e * 0.12);
    view.rotateZ((st.hand ? -1 : 1) * e * 0.025);
  } else if (st.kind === 'row') {
    copy();
    eye.getWorldDirection(v3);
    v3.y = 0;
    v3.normalize();
    const d = st.drive || 0;
    view.position.addScaledVector(v3, lerp(0.35, -0.35, d));
    view.position.y -= 0.65;
  } else return null;
  view.updateProjectionMatrix();
  return view;
}
