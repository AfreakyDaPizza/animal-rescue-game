// 😈 Demonic Ranger 皮膚（小朋友 Issue #11：🧙 Witch Tower 獎品）
// 個樣：深紅黑戰衣、細細對彎角、發光琥珀眼、背後一對細蝙蝠翼、尾巴（發光箭咀）、手腳熔岩邊、心口熔岩裂紋
// 動畫：
//   - 行路 = 飛！公仔離地少少浮住（腳垂低）、翼仔拍得快啲、身少少向前傾、腳底拖住一條火星尾巴
//   - 跳 = 腳底「噗」一嚿火噴射推你上去（火柱 + 地上火圈 + 火星 + 「呼」一聲）
//   - 企定：翼仔慢慢拍、尾巴擺
// 跳嘅高度同普通一樣（純粹特效，唔影響玩法）
//
// 用法：
//   thirdPerson.js：buildAvatar 入面 buildDemonicParts(make, { head, torso, arms, legs })；每格 animateDemonic(avatar, t, anim, held)
//   main.js：const demonicFx = createDemonicRanger(scene)
//            updateDemonicRanger(demonicFx, dt, { player, camera, tp: thirdPerson, on: state.rangerSkin === 'demonic', ready, play })
//            （要喺 updatePlayer 之後、main.js 讀 player.jumped 之前）

import * as THREE from 'three';
import { B, pivot, cone, tube, V } from './echoPetModels.js';
import { glowMat, crack } from './meteorPetModels.js';
import { horn, batWing, fireTuft, LAVA, EMBER, FIRE } from './demonicPetModels.js';

const HOVER = 0.38; // 飛嗰陣離地幾高（米）
const TRAIL_EVERY = 0.035; // 幾耐出一粒火星（秒）
const JET_TIME = 0.65; // 跳嗰陣火柱幾耐
const MAX_PARTS = 140;

// ======================== 公仔配件 ========================
export function buildDemonicParts(make, { head, torso, arms, legs }) {
  const lavaM = glowMat(LAVA, 2.2);
  const eyeM = glowMat(EMBER, 2.6);
  const fire = [glowMat(FIRE, 2.2, { transparent: true, opacity: 0.9 }), glowMat(LAVA, 2.8, { transparent: true, opacity: 0.92 }), glowMat(EMBER, 3.4)];
  // 頭：彎角 + 發光眼 + 兩角中間一撮細火 + 面頰熔岩紋
  const h = make('demonic', head);
  for (const s of [-1, 1]) {
    horn(h, s * 0.2, 0.31, 0.02, 1.25, s, { color: 0x2b0d0f });
    B(h, 0.1, 0.12, 0.02, EMBER, s * 0.15, 0.04, -0.352, eyeM, { r: 0.3 });
    crack(h, s * 0.27, -0.12, -0.338, 0.12, s * 0.5, lavaM, 0.02);
  }
  const flame = fireTuft(h, 0, 0.33, 0.04, 0.5, fire);
  // 身：熔岩裂紋 + 發光皮帶 + 翼 + 尾
  const body = make('demonicBody', torso);
  crack(body, -0.18, 1.62, -0.24, 0.3, 0.5, lavaM, 0.03);
  crack(body, 0.2, 1.48, -0.24, 0.26, -0.6, lavaM, 0.03);
  crack(body, 0.0, 1.25, -0.24, 0.2, 0.3, lavaM, 0.025);
  B(body, 0.88, 0.06, 0.48, LAVA, 0, 1.02, 0, lavaM, { r: 0.3 }).castShadow = false;
  const wings = [-1, 1].map((s) => {
    const root = pivot(body, s * 0.16, 1.66, 0.25);
    const w = batWing(root, 0, 0, 0, 1.25, s, 0x6a1018, LAVA, { membrane: { emissive: 0x5a0000, emissiveIntensity: 0.7 }, bone: lavaM });
    w.rotation.x = 0.15;
    return root;
  });
  const tail = pivot(body, 0, 1.0, 0.24);
  tube(tail, [V(0, 0, 0), V(0, -0.22, 0.25), V(0, -0.1, 0.5), V(0, 0.12, 0.56)], 0.035, 0x3a0d12, {});
  const tip = pivot(tail, 0, 0.13, 0.56);
  cone(tip, 0.09, 0.16, LAVA, 0, 0.05, 0, lavaM, 4);
  // 手腳：熔岩邊
  arms.forEach((sh, i) => {
    const e = make(`demonic_arm${i}`, sh);
    B(e, 0.37, 0.07, 0.37, LAVA, 0, -0.66, 0, lavaM, { r: 0.3 }).castShadow = false;
    crack(e, 0, -0.2, -0.175, 0.26, 0.4, lavaM, 0.025);
  });
  legs.forEach((hip, i) => {
    const e = make(`demonic_leg${i}`, hip);
    B(e, 0.42, 0.06, 0.46, LAVA, 0, -0.72, -0.02, lavaM, { r: 0.3 }).castShadow = false;
  });
  return { lavaM, eyeM, fire, flame, wings, tail };
}

const mix = (a, b, k) => a + (b - a) * k;

// 每格：喺 applyLocomotion 之後覆蓋少少姿勢（飛、拍翼、尾巴）
// a = trackMotion 嘅比重（move 行緊、run 跑緊、air 半空）
export function animateDemonic(avatar, t, a, held) {
  const d = avatar.demonic;
  if (!d) return;
  const move = a ? a.move : 0;
  const air = a ? a.air : 0;
  const fly = Math.max(move, air * 0.6);
  // 翼：企定慢慢拍，飛嗰陣拍得快、拍得大
  const speed = mix(3, 13, fly);
  const flap = Math.sin(t * speed);
  d.wings.forEach((w, i) => {
    const s = i ? 1 : -1;
    w.rotation.y = s * -(0.45 + flap * mix(0.25, 0.6, fly));
    w.rotation.z = s * (0.1 + flap * 0.08 * fly);
  });
  d.tail.rotation.y = Math.sin(t * 2.2) * 0.35;
  d.tail.rotation.x = -0.2 * fly + Math.sin(t * 3.1) * 0.08;
  d.flame.scale.set(1, 0.85 + Math.sin(t * 11) * 0.2, 1);
  d.fire[1].emissiveIntensity = 2.5 + Math.sin(t * 8) * 0.5;
  d.lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.8) * 0.6;
  d.eyeM.emissiveIntensity = 2.2 + Math.sin(t * 1.7) * 0.5;
  // 行路 = 飛：浮高、腳垂低（唔再大步行）、身向前傾、手少少向後
  if (move > 0.01 && air < 0.99) {
    const k = move * (1 - air);
    avatar.g.position.y += HOVER * k + Math.sin(t * speed) * 0.05 * k;
    avatar.g.rotation.x = mix(avatar.g.rotation.x, -0.22, k);
    const [L, R] = avatar.legs;
    L.rotation.x = mix(L.rotation.x, 0.28 + Math.sin(t * 2.4) * 0.08, k);
    R.rotation.x = mix(R.rotation.x, 0.12 + Math.sin(t * 2.4 + 1) * 0.08, k);
    if (!held) {
      const [AL, AR] = avatar.arms;
      AL.rotation.x = mix(AL.rotation.x, -0.35, k);
      AR.rotation.x = mix(AR.rotation.x, -0.35, k);
      AL.rotation.z = mix(AL.rotation.z, -0.25, k);
      AR.rotation.z = mix(AR.rotation.z, 0.25, k);
    }
  }
}

// ======================== 特效（火星尾巴、火噴射） ========================
const partGeo = new THREE.OctahedronGeometry(0.07);
const addMat = (c, o = 0.95) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const partMats = [0xff3d00, 0xff6d00, 0xffab00, 0xffd740].map((c) => addMat(c));
const darkMat = new THREE.MeshBasicMaterial({ color: 0x3e0a0a, transparent: true, opacity: 0.6, depthWrite: false });
const jetGeo = new THREE.ConeGeometry(0.42, 1.6, 14, 1, true);
const ringGeo = new THREE.RingGeometry(0.75, 1, 48);
const flameGeo = new THREE.ConeGeometry(0.16, 0.9, 8, 1, true);
flameGeo.translate(0, 0.45, 0); // 底喺地面

export function createDemonicRanger(scene) {
  const D = { scene, group: new THREE.Group(), parts: [], jets: [], trailT: 0 };
  D.group.name = 'demonicRanger';
  scene.add(D.group);
  if (import.meta.env?.DEV) window.demonicFx = D; // 測試用
  return D;
}

function spark(D, x, y, z, vx, vy, vz, life, size = 1, dark = false) {
  if (D.parts.length >= MAX_PARTS) return;
  const m = new THREE.Mesh(partGeo, dark ? darkMat : partMats[(Math.random() * partMats.length) | 0]);
  m.position.set(x, y, z);
  D.group.add(m);
  D.parts.push({ m, v: new THREE.Vector3(vx, vy, vz), life, t: 0, s: size * (0.7 + Math.random() * 0.6), spin: Math.random() * 10 });
}

// 🔥 跳：腳底噴火
function fireJet(D, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  D.group.add(g);
  const cones = [[FIRE, 1.0, 0.8], [LAVA, 0.72, 0.9], [EMBER, 0.42, 1]].map(([c, s, o]) => {
    const m = new THREE.Mesh(jetGeo, addMat(c, o));
    m.rotation.x = Math.PI; // 尖向下
    m.scale.set(s, 0.01, s);
    g.add(m);
    return m;
  });
  const ring = new THREE.Mesh(ringGeo, addMat(LAVA, 0.9));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.05, z);
  D.group.add(ring);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0x1a0505, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(x, y + 0.03, z);
  D.group.add(scorch);
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    spark(D, x, y + 0.1, z, Math.cos(a) * sp, 0.5 + Math.random() * 2.5, Math.sin(a) * sp, 0.5 + Math.random() * 0.4, 1.3);
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    spark(D, x, y + 0.2, z, Math.cos(a) * 1.5, 1 + Math.random(), Math.sin(a) * 1.5, 0.9, 2.2, true); // 黑煙
  }
  const crown = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(flameGeo, addMat(i % 2 ? LAVA : FIRE, 0.9));
    m.position.set(x + Math.cos(a) * 0.55, y, z + Math.sin(a) * 0.55);
    m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); // 向外斜
    m.scale.setScalar(0.01);
    D.group.add(m);
    crown.push(m);
  }
  D.jets.push({ g, cones, ring, scorch, crown, y0: y, t: 0 });
}

export function updateDemonicRanger(D, dt, { player, camera, tp, on, ready = true, play }) {
  const pos = camera.position;
  if (on && ready) {
    // 跳：噴火（player.jumped 由 updatePlayer 設定，main.js 之後先清）
    if (player.jumped) {
      fireJet(D, pos.x, player.feetY, pos.z);
      play?.('fireJet');
    }
    // 行路（飛）：腳底拖住一條火星尾巴
    const third = tp.zoom > 0;
    if (player.walking || !player.grounded) {
      D.trailT += dt;
      while (D.trailT >= TRAIL_EVERY) {
        D.trailT -= TRAIL_EVERY;
        const yaw = camera.rotation.y;
        const bx = Math.sin(yaw) * 0.35; // 後面少少
        const bz = Math.cos(yaw) * 0.35;
        const y = player.feetY + (player.grounded ? HOVER * 0.6 : 0.1) + Math.random() * 0.25;
        spark(D, pos.x + bx + (Math.random() - 0.5) * 0.4, y, pos.z + bz + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.4, third ? 1.5 : 0.8);
      }
    } else D.trailT = 0;
  }
  // 火柱：跟住腳底，0.1 秒噴出、之後縮細
  for (let i = D.jets.length - 1; i >= 0; i--) {
    const j = D.jets[i];
    j.t += dt;
    const k = j.t / JET_TIME;
    if (k < 1) {
      j.g.position.set(pos.x, player.feetY + 0.05, pos.z);
      const grow = Math.min(1, j.t / 0.08);
      const len = grow * (1 - k * k) * Math.min(2.2, 0.5 + Math.max(0, player.feetY - j.y0) * 0.7) / 0.85;
      j.cones.forEach((c, n) => {
        const w = [1.0, 0.72, 0.42][n] * (1 + Math.sin(j.t * 60 + n) * 0.08);
        c.scale.set(w, Math.max(0.01, len * (1 - n * 0.15)), w);
        c.position.y = -0.8 * c.scale.y + 0.1;
        c.material.opacity = (1 - k) * [0.8, 0.9, 1][n];
      });
      if (Math.random() < dt * 60) spark(D, pos.x + (Math.random() - 0.5) * 0.3, player.feetY - 0.1, pos.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 1.5, -1.5 - Math.random() * 2, (Math.random() - 0.5) * 1.5, 0.4, 1.1);
    } else j.g.visible = false;
    j.crown.forEach((m, n) => {
      const ck = Math.min(1, j.t / 0.5);
      const h = Math.sin(ck * Math.PI) * (1 + Math.sin(j.t * 40 + n) * 0.15);
      m.scale.set(1, Math.max(0.01, h * 1.3), 1);
      m.material.opacity = 0.9 * (1 - ck);
    });
    const rk = Math.min(1, j.t / 0.6);
    j.ring.scale.setScalar(0.3 + (1 - (1 - rk) ** 3) * 2.2);
    j.ring.material.opacity = Math.max(0, 1 - rk) * 0.9;
    j.scorch.material.opacity = Math.max(0, 0.5 * (1 - Math.max(0, j.t - 0.8) / 1.2));
    if (j.t > 2.0) {
      j.g.removeFromParent();
      j.ring.removeFromParent();
      j.scorch.removeFromParent();
      j.cones.forEach((c) => c.material.dispose());
      j.crown.forEach((m) => (m.removeFromParent(), m.material.dispose()));
      j.ring.material.dispose();
      j.scorch.material.dispose();
      j.scorch.geometry.dispose();
      D.jets.splice(i, 1);
    }
  }
  // 火星
  for (let i = D.parts.length - 1; i >= 0; i--) {
    const p = D.parts[i];
    p.t += dt;
    p.v.multiplyScalar(Math.exp(-2.2 * dt));
    p.v.y += (p.m.material === darkMat ? 0.6 : 1.2) * dt; // 火星向上飄
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.set(p.t * p.spin, p.t * p.spin * 0.7, 0);
    p.m.scale.setScalar(Math.max(0.001, p.s * (1 - p.t / p.life)));
    if (p.t > p.life) {
      p.m.removeFromParent();
      D.parts.splice(i, 1);
    }
  }
}
