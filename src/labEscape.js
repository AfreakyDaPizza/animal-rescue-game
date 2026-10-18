// 實驗室爆炸逃走動畫（小朋友 Issue #4）：打贏 Mutated Scientist Poacher 之後
// 警報響、紅燈閃 → 你由實驗室後面跑出門口 → 成間實驗室喺你後面爆炸 → 你及時走出嚟
// 小朋友 2026-10-18：實驗室爆咗就冇咗！煙散嘅時候，原位升起一間 GYM（OPENING SOON），門外有傳送門去秘密沙灘
// （Owner 俾錢嗰段搬咗去：第一次行入傳送門去沙灘先播）

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { play } from './sound.js';
import { state } from './state.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { LAB, LAB_DOOR_Z, GYM, GYM_DOOR_X, GYM_DOOR_Z, GYM_PORTAL, labStatus } from './labShape.js';
import { gym } from './gym.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);

// 一個火球：一嚿嚿發光球由細變大再散
function fireball(root, at, size, delay) {
  const g = new THREE.Group();
  const parts = [0xfff59d, 0xffab00, 0xff6d00, 0xd84315].map((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3 - i * 0.5, transparent: true, opacity: 1, fog: false }));
    m.position.set((Math.random() - 0.5) * size * 0.4, (Math.random() - 0.2) * size * 0.4, (Math.random() - 0.5) * size * 0.4);
    g.add(m);
    return m;
  });
  g.position.copy(at);
  g.visible = false;
  root.add(g);
  return { g, parts, size, delay, t: 0 };
}

export function playLabEscape({ scene, camera, onDone }) {
  const root = new THREE.Group();
  scene.add(root);
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === state.rangerSkin) || RANGER_SKINS[0]);
  me.g.scale.setScalar(1.2);
  root.add(me.g);
  const RUN = [V(0, 0, LAB.maxZ - 4), V(0, 0, LAB_DOOR_Z - 6), V(GYM_DOOR_X + 1, 0, GYM_DOOR_Z - 9)]; // 實驗室後面 → 門口外面 → Gym 門口
  me.g.position.copy(RUN[0]);
  let phase = 0;
  // 實驗室入面嘅細爆炸（火花）同最後嘅大爆炸
  const small = Array.from({ length: 8 }, (_, i) => fireball(root, V((Math.random() - 0.5) * 40, 1 + Math.random() * 4, LAB_DOOR_Z + 8 + Math.random() * 38), 2.2, 0.5 + i * 0.6));
  const big = Array.from({ length: 12 }, (_, i) => fireball(root, V((i % 4 - 1.5) * 13, 5 + (i % 2) * 6, LAB_DOOR_Z + 4 + Math.floor(i / 4) * 15), 16, 8.6 + i * 0.1));
  // 飛出嚟嘅碎片
  const debris = Array.from({ length: 30 }, () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: Math.random() < 0.5 ? 0x2a3448 : 0x00e5ff, emissive: 0x00bcd4, emissiveIntensity: Math.random() < 0.3 ? 1.5 : 0 }));
    m.position.set((Math.random() - 0.5) * 40, 3, LAB_DOOR_Z + 10 + Math.random() * 35);
    m.visible = false;
    root.add(m);
    return { m, v: V((Math.random() - 0.5) * 18, 12 + Math.random() * 16, (Math.random() - 0.4) * 16) };
  });
  // 煙（好濃，遮住實驗室變 Gym 嗰下）
  const smoke = Array.from({ length: 24 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), new THREE.MeshStandardMaterial({ color: i % 3 ? 0x455a64 : 0x37474f, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set((i % 6 - 2.5) * 10, 4, LAB_DOOR_Z + 6 + Math.floor(i / 6) * 11);
    root.add(m);
    return m;
  });

  const SWAP = 10.4; // 煙最濃：實驗室冇咗，Gym 開始由地底升上嚟
  const RISE = 3.2; // 升幾耐
  playMovie(camera, {
    length: 22.5,
    shots: [
      [0, 3.2, { p: V(4, 3.4, LAB.maxZ - 13), l: V(0, 2, LAB.maxZ - 4) }, { p: V(3, 3, LAB.maxZ - 15), l: V(0, 2, LAB.maxZ - 8) }], // 警報！佢向鏡頭跑過嚟
      [3.2, 6.6, { p: V(-6, 2.6, LAB_DOOR_Z + 4), l: V(0, 2, LAB_DOOR_Z + 20) }, { p: V(-5, 2.4, LAB_DOOR_Z + 2), l: V(0, 2, LAB_DOOR_Z + 8) }], // 衝向門口
      [6.6, 15, { p: V(10, 5, LAB_DOOR_Z - 34), l: V(0, 6, LAB_DOOR_Z + 4) }, { p: V(6, 6.5, LAB_DOOR_Z - 30), l: V(0, 5, LAB_DOOR_Z + 14) }], // 前院：實驗室爆炸 → 煙散 → Gym 升起
      [15, 18.8, { p: V(9, 3, GYM_DOOR_Z - 17), l: V(0, 6, GYM_DOOR_Z) }, { p: V(4, 2.4, GYM_DOOR_Z - 13), l: V(0, 6.5, GYM_DOOR_Z) }], // 新 Gym 大門（OPENING SOON）
      [18.8, 22.5, { p: V(GYM_PORTAL.x + 3, 3, GYM_PORTAL.z - 9), l: V(GYM_PORTAL.x, GYM_PORTAL.y, GYM_PORTAL.z) }, { p: V(GYM_PORTAL.x + 1.5, 2.8, GYM_PORTAL.z - 6.5), l: V(GYM_PORTAL.x, GYM_PORTAL.y, GYM_PORTAL.z) }], // 門外嘅傳送門
    ],
    captions: [
      [0.2, '⚠️ WARNING! The Laboratory is going to EXPLODE! RUN!'],
      [6.6, '...'],
      [8.8, '💥 KABOOM!!!'],
      [10.6, 'The Laboratory is GONE! But wait... something is rising from the smoke! 👀'],
      [15, '💪 A brand new RANGER GYM! Opening soon!'],
      [18.8, '🌀 And a glowing portal to a SECRET BEACH! 🏖️'],
    ],
    lines: [[1.2, 3, () => me.head, 'I have to get out of here!', 'ranger']],
    update(t, dt) {
      if (once('alarm')) play('alarm');
      // 紅燈閃（實驗室入面）
      // 警報紅光：畫面四邊淡淡哋紅一紅（一秒一次，唔好成個畫面閃）
      $('movie-blink').style.background = t < 8.6 ? 'radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(198,40,40,0.45) 100%)' : '#000';
      if (t < 8.6 && Math.floor(t) !== Math.floor(t - dt)) {
        const b = $('movie-blink');
        b.classList.remove('on');
        void b.offsetWidth;
        b.classList.add('on');
        if (t < 6.6 && Math.floor(t) % 2 === 0) play('alarm');
      }
      // 跑：0–6.6 秒由後面跑去門口外面，12 秒之後喺沙灘行
      if (t > 6.6 && phase === 0) {
        phase = 1;
        me.g.position.set(0, 0, LAB_DOOR_Z - 1);
      }
      if (t > 15 && phase === 1) {
        phase = 2;
        me.g.position.set(GYM_DOOR_X + 3, 0, GYM_DOOR_Z - 15);
      }
      const goal = phase === 0 ? V(0, 0, LAB_DOOR_Z - 2) : phase === 1 ? RUN[1].clone().add(V(0, 0, -22)) : RUN[2];
      const d = goal.clone().sub(me.g.position);
      d.y = 0;
      const moving = d.length() > 0.3;
      if (moving) {
        me.g.position.add(d.clampLength(0, dt * (phase === 2 ? 2.5 : 9)));
        me.g.rotation.y = Math.atan2(-d.x, -d.z);
      }
      const swing = moving ? Math.sin(t * (phase === 2 ? 9 : 16)) * (phase === 2 ? 0.6 : 1.1) : 0;
      me.legs[0].rotation.x = swing;
      me.legs[1].rotation.x = -swing;
      me.arms[0].rotation.x = -swing;
      me.arms[1].rotation.x = swing;
      // 爆炸
      for (const f of [...small, ...big]) {
        if (t < f.delay) continue;
        f.t += dt;
        f.g.visible = f.t < 2.2;
        const k = Math.min(1, f.t / 0.5);
        f.parts.forEach((p, i) => {
          p.scale.setScalar(f.size * (0.4 + i * 0.25) * k);
          p.material.opacity = Math.max(0, 1 - Math.max(0, f.t - 0.6) / 1.5);
        });
        if (once(`boom${f.delay}`)) {
          shake(f.size > 5 ? 0.6 : 0.12);
          play('hit');
        }
      }
      if (t > 8.6 && once('kaboom')) {
        play('rumble');
        play('boom');
        const fade = $('movie-fade');
        fade.style.background = '#fff';
        fade.style.opacity = 0.9;
        setTimeout(() => {
          fade.style.opacity = 0;
          setTimeout(() => (fade.style.background = '#000'), 600);
        }, 150);
        debris.forEach((p) => (p.m.visible = true));
      }
      if (t > 8.6) {
        for (const p of debris) {
          p.v.y -= 22 * dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.rotation.x += dt * 5;
          p.m.rotation.y += dt * 3;
          if (p.m.position.y < 0.3) {
            p.m.position.y = 0.3;
            p.v.set(0, 0, 0);
          }
        }
        // 煙：好快變濃，SWAP 之後慢慢散（散嘅時候見到 Gym 升起）
        const fadeOut = Math.max(0, Math.min(1, (t - SWAP - 0.6) / 3));
        smoke.forEach((m, i) => {
          m.material.opacity = Math.min(0.9, (t - 8.6) * 0.9) * (1 - fadeOut);
          m.position.y = 4 + (t - 8.6) * (1.2 + (i % 3) * 0.6);
          m.scale.setScalar(1 + (t - 8.6) * 0.35);
        });
      }
      // 實驗室冇咗 → Gym 由地底升上嚟（地震咁震）
      if (t > SWAP && once('swap')) {
        labStatus.gone = true; // main.js：Gym 出現；lab.js：實驗室座樓同佢嘅撞嘢冇咗
        debris.forEach((p) => (p.m.visible = false));
        play('rumble');
      }
      if (gym.holder) {
        const k = t < SWAP ? 0 : Math.min(1, (t - SWAP) / RISE);
        gym.holder.position.y = -(GYM.wallH + 7) * (1 - k) ** 2;
        if (t > SWAP && k < 1) shake(0.08);
        if (k === 1 && once('risen')) play('ring');
      }
      return null;
    },
    onDone() {
      $('movie-blink').style.background = '#000';
      labStatus.gone = true;
      if (gym.holder) gym.holder.position.y = 0;
      scene.remove(root);
      onDone?.();
    },
  });
}
