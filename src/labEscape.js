// 實驗室爆炸逃走動畫（小朋友 Issue #4）：打贏 Mutated Scientist Poacher 之後
// 警報響、紅燈閃 → 你由實驗室後面跑出門口 → 成間實驗室喺你後面爆炸 → 你及時走出嚟，見到秘密沙灘
// 之後先播原本嘅結局（動物返地塊、Owner 俾錢）

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { play } from './sound.js';
import { state } from './state.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { LAB, LAB_DOOR_Z, BEACH } from './labShape.js';

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
  const RUN = [V(0, 0, LAB.maxZ - 4), V(0, 0, LAB_DOOR_Z - 6), V(BEACH.minX + 8, 0, 82)]; // 實驗室後面 → 門口外面 → 沙灘
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
  // 煙
  const smoke = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshStandardMaterial({ color: 0x37474f, transparent: true, opacity: 0 }));
    m.position.set((i % 5 - 2) * 9, 5, LAB_DOOR_Z + 12 + Math.floor(i / 5) * 12);
    root.add(m);
    return m;
  });

  playMovie(camera, {
    length: 16.5,
    shots: [
      [0, 3.2, { p: V(4, 3.4, LAB.maxZ - 13), l: V(0, 2, LAB.maxZ - 4) }, { p: V(3, 3, LAB.maxZ - 15), l: V(0, 2, LAB.maxZ - 8) }], // 警報！佢向鏡頭跑過嚟
      [3.2, 6.6, { p: V(-6, 2.6, LAB_DOOR_Z + 4), l: V(0, 2, LAB_DOOR_Z + 20) }, { p: V(-5, 2.4, LAB_DOOR_Z + 2), l: V(0, 2, LAB_DOOR_Z + 8) }], // 衝向門口
      [6.6, 12, { p: V(10, 5, LAB_DOOR_Z - 34), l: V(0, 6, LAB_DOOR_Z + 4) }, { p: V(12, 6, LAB_DOOR_Z - 38), l: V(0, 8, LAB_DOOR_Z + 6) }], // 前院：佢跑出嚟，實驗室喺後面爆炸
      [12, 16.5, { p: V(BEACH.minX + 2, 3, 76), l: V(BEACH.maxX + 30, 4, 84) }, { p: V(BEACH.minX + 4, 2.8, 77), l: V(BEACH.maxX + 30, 6, 84) }], // 秘密沙灘
    ],
    captions: [
      [0.2, '⚠️ WARNING! The Laboratory is going to EXPLODE! RUN!'],
      [6.6, '...'],
      [8.8, '💥 KABOOM!!!'],
      [12, 'You made it out just in time... and found a beautiful hidden beach! 🏖️'],
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
      if (t > 12 && phase === 1) {
        phase = 2;
        me.g.position.set(BEACH.minX + 6, 0, 80);
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
        smoke.forEach((m, i) => {
          m.material.opacity = Math.min(0.75, (t - 8.6) * 0.5);
          m.position.y = 5 + (t - 8.6) * (2 + (i % 3));
          m.scale.setScalar(1 + (t - 8.6) * 0.3);
        });
      }
      return null;
    },
    onDone() {
      $('movie-blink').style.background = '#000';
      scene.remove(root);
      onDone?.();
    },
  });
}
