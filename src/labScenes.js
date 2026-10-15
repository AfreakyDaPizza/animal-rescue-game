// Issue #2 嘅兩段動畫：
// 1. 開門動畫：圖鑑夠 25 隻 → 大門鐵鏈震、大鎖彈開、閘門打開、鏡頭飛過大門望到實驗室
// 2. 結局動畫（見下面 playEnding）

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { lab, openParkGate } from './lab.js';
import { setGateOpen, PARK_GATE } from './hubPark.js';
import { play } from './sound.js';
import { state, save } from './state.js';
import { LAB_UNLOCK_PETS } from './data/balance.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const G = PARK_GATE;

// ---------- 閃閃星星（開鎖時爆出嚟） ----------
function sparkles(scene, at, color = 0xffeb3b, n = 40) {
  const group = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 });
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + Math.random() * 0.1), m);
    s.position.copy(at);
    group.add(s);
    parts.push({ s, v: new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 5).add(V(0, 3, 0)) });
  }
  scene.add(group);
  let life = 0;
  return (dt) => {
    life += dt;
    for (const p of parts) {
      p.v.y -= 9 * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.rotation.y += dt * 8;
      p.s.scale.setScalar(Math.max(0, 1 - life / 2));
    }
    if (life > 2) scene.remove(group);
    return life <= 2;
  };
}

// ================= 1. 開門動畫（約 15 秒） =================
export function playUnlockScene({ scene, camera, onDone }) {
  const { padlock, chains, group } = lab.lock;
  const padStart = padlock.position.clone();
  const fx = [];
  let padV = null;
  const chainV = chains.map(() => 0);
  playMovie(camera, {
    length: 15.5,
    shots: [
      [0, 6.5, { p: V(0, 3.2, G.z - 15), l: V(0, 2.6, G.z) }, { p: V(0, 2.8, G.z - 8), l: V(0, 2.4, G.z) }], // 慢慢推近個鎖
      [6.5, 9.5, { p: V(-7, 4, G.z - 11), l: V(0, 2.5, G.z) }, { p: V(-4, 3.5, G.z - 9), l: V(0, 2.5, G.z + 2) }], // 閘門打開
      [9.5, 15.5, { p: V(0, 3, G.z - 6), l: V(0, 3, G.z + 30) }, { p: V(0, 15, G.z + 12), l: V(0, 3, 112) }], // 飛過大門，望到實驗室
    ],
    captions: [
      [0.3, `You found ${LAB_UNLOCK_PETS} pets for your Index! The animals trust you now...`],
      [3, 'The Animal Rescue gate is shaking!'],
      [6.5, 'The ANIMAL RESCUE gate is UNLOCKED! 🔓'],
      [9.5, 'But something creepy is waiting outside... the LABORATORY! 🔬'],
      [12.8, 'Follow the green arrows! ➡️'],
    ],
    update(t, dt) {
      // 鐵鏈震、大鎖發光
      if (t > 3 && t < 5.2) {
        if (once('rumble')) play('rumble');
        shake(0.05);
        chains.forEach((c, i) => (c.position.x = Math.sin(t * 40 + i) * 0.05));
        padlock.rotation.z = Math.sin(t * 30) * 0.2;
        padlock.children[0].material.emissive?.set(0xffab00);
        if (padlock.children[0].material.emissive) padlock.children[0].material.emissiveIntensity = (t - 3) * 1.5;
      }
      // 大鎖彈開、鐵鏈跌落地
      if (t > 5.2 && once('pop')) {
        play('magic');
        play('pop');
        shake(0.15);
        padV = V(0.5, 5, -3);
        fx.push(sparkles(scene, padlock.getWorldPosition(V(0, 0, 0))));
      }
      if (padV) {
        padV.y -= 14 * dt;
        padlock.position.addScaledVector(padV, dt);
        padlock.rotation.x += dt * 6;
        if (padlock.position.y < 0.2) padlock.visible = false;
        chains.forEach((c, i) => {
          chainV[i] -= 10 * dt;
          c.position.y = Math.max(0.1 - 2.4, c.position.y + chainV[i] * dt);
          c.rotation.z *= 1 - dt * 2;
        });
      }
      // 閘門打開
      if (t > 6.5 && t < 9.5) {
        if (once('open')) {
          play('tierUp');
          group.visible = false;
        }
        setGateOpen(Math.min(1, (t - 6.5) / 1.8));
      }
      if (t > 9.5 && once('lab')) play('alarm');
      for (let i = fx.length - 1; i >= 0; i--) if (!fx[i](dt)) fx.splice(i, 1);
      return null;
    },
    onDone() {
      // 跳過都要執返好
      padlock.position.copy(padStart);
      padlock.rotation.set(0, 0, 0);
      padlock.visible = true;
      chains.forEach((c) => c.position.set(0, 2.4, 0));
      openParkGate();
      state.labUnlocked = true;
      save();
      onDone?.();
    },
  });
}
