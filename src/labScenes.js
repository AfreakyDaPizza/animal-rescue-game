// Issue #2 嘅兩段動畫：
// 1. 開門動畫：撳咗 Magic Library 後面嘅秘密紅色掣 → 大門鐵鏈震、大鎖彈開、閘門打開、鏡頭飛過大門望到實驗室
// 2. 結局動畫（見下面 playEnding）

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { lab, openParkGate } from './lab.js';
import { setGateOpen, PARK_GATE, park, standUp, lieOnHammock } from './hubPark.js';
import { play } from './sound.js';
import { state, save } from './state.js';
import { LAB_REWARD } from './data/balance.js';
import { buildBossRig, animateRig } from './bosses.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { makeLabel } from './signs.js';
import { ARENA, BOSS_PORTAL, EXIT_PORTAL } from './labShape.js';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';

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
      [0.3, 'CRACK! The chains are breaking! 🔓'],
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

// ================= 2. 結局動畫（約 46 秒） =================
// 1. Boss 瞓低咗（喺圓形 Arena）；佢啲生態區 Boss 由傳送門走出嚟
// 2. 佢捉咗嘅瀕危動物（包括你交俾傳送門嗰幾隻）醒咗，避開啲 Boss，由出口走
// 3. 跑過大門 → 4. 跑入你個地塊（開心到跳）
// 5. Owner 多謝你，俾 $1000 → 6. 黑畫面大字（小朋友寫嘅結局）
export const ENDING_ANIMALS = ['Giant Panda', 'Red Panda', 'Polar Bear', 'Snow Leopard', 'Sumatran Tiger', 'Mountain Gorilla'];
// short = true：淨係播 Arena 嗰段（0–11 秒，動物醒、走出傳送門），之後由 main.js 接住播爆炸同沙灘（小朋友 Issue #4 之後）
export function playEnding({ scene, camera, fight, onPaid, onDone, short = false }) {
  const root = new THREE.Group();
  scene.add(root);
  const B = fight.group.position.clone();
  // Boss 一定係瞓低咗（例如 F5 之後先播都係）
  fight.group.visible = true;
  fight.rig.g.visible = true;
  fight.rig.root.rotation.x = -Math.PI / 2 + 0.05;
  fight.rig.root.position.y = 0.6;
  fight.rig.stars.visible = true;

  // 6 個生態區 Boss：由 Boss 傳送門（北邊）行出嚟
  const bosses = [0, 1, 2, 3, 4, 5].map((i) => {
    const rig = buildBossRig(i);
    const g = new THREE.Group();
    g.add(rig.g);
    rig.g.scale.setScalar(1.1);
    g.position.set(BOSS_PORTAL.x, 0, BOSS_PORTAL.z + 0.5);
    g.rotation.y = Math.PI;
    g.visible = false;
    root.add(g);
    return { rig, g, runPhase: 0, goal: V(ARENA.x - 12.5 + i * 5, 0, BOSS_PORTAL.z + 6 + (i % 2) * 2) };
  });
  // 被捉嘅動物：你交咗俾傳送門嗰幾種先，唔夠就用其他
  const names = [...new Set([...state.labGivenSpecies, ...ENDING_ANIMALS])].slice(0, 6);
  const pets = names.map((name, i) => {
    const animal = ANIMALS.find((a) => a.name === name) || ANIMALS[i];
    const model = buildAnimalModel(animal);
    const size = new THREE.Box3().setFromObject(model).getSize(V(0, 0, 0));
    model.scale.multiplyScalar(Math.min(1.4, 2.2 / Math.max(size.x, size.y, size.z)));
    if (model.userData.move === 'fly') model.userData.flying = false;
    const holder = new THREE.Group();
    holder.position.set(ARENA.x - 7.5 + i * 3, 0, ARENA.z - 4 + (i % 2) * 2);
    holder.rotation.y = Math.PI; // 面向南（出口）
    holder.add(model);
    const mark = makeLabel([{ text: '💤', color: '#b3e5fc' }], 0.7);
    mark.position.y = 3.2;
    holder.add(mark);
    root.add(holder);
    return { holder, model, mark, i };
  });
  // Ranger（你）
  const ranger = buildAvatar();
  applyRangerSkin({ avatar: ranger }, RANGER_SKINS.find((s) => s.id === state.rangerSkin) || RANGER_SKINS[0]);
  ranger.g.scale.setScalar(1.2);
  ranger.g.position.set(8.4, 0, 9.5);
  ranger.g.rotation.y = Math.PI / 2; // 面向 -x（Owner）
  ranger.g.visible = false;
  root.add(ranger.g);
  // 一袋錢（Owner 交俾你）
  const cash = new THREE.Group();
  cash.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8d6e63 })));
  const tag = makeLabel([{ text: `💰 $${LAB_REWARD.toLocaleString('en-US')}`, color: '#ffeb3b' }], 0.9);
  tag.position.y = 0.8;
  cash.add(tag);
  cash.visible = false;
  root.add(cash);

  const owner = park.owner;
  const ownerPhase = { v: 0 };
  let paid = false;
  const pay = () => {
    if (paid) return;
    paid = true;
    onPaid?.();
  };
  const PLOT_SPOTS = pets.map((_, i) => V(15.5 + (i % 3) * 4.5, 0, 6 + Math.floor(i / 3) * 6));
  const walk = (obj, goal, speed, dt) => {
    const d = goal.clone().sub(obj.position);
    d.y = 0;
    const dist = d.length();
    if (dist < 0.1) return false;
    obj.position.addScaledVector(d.normalize(), Math.min(dist, speed * dt));
    obj.rotation.y = Math.atan2(-d.x, -d.z);
    return true;
  };
  const finalLines = [
    'You saved the endangered animals!',
    `You got paid $${LAB_REWARD.toLocaleString('en-US')}...`,
    "but something's missing...",
    'the pets wanted you to stay here forever,',
    'so you decided to stay with them forever.',
  ].map((t, i) => `<span class="line" style="animation-delay:${(i * 2.3).toFixed(1)}s">${t}</span>`).join('')
    + '<small class="line" style="animation-delay:11.8s">🐾 THE END 🐾</small>';
  const AZ = ARENA.z;
  const EXIT = V(EXIT_PORTAL.x, 0, EXIT_PORTAL.z - 1);

  playMovie(camera, {
    length: short ? 11 : 46,
    skipText: 'Click or press any key to keep playing ▶',
    final: short ? null : { at: 31, html: finalLines },
    shots: [
      [0, 5, { p: V(B.x + 17, 10, B.z + 19), l: V(B.x, 1.5, B.z) }, { p: V(B.x + 13, 8, B.z + 15), l: V(B.x, 1.2, B.z) }], // Boss 瞓低咗（企遠啲，佢好大隻）
      [5, 11, { p: V(ARENA.x, 10, AZ + 22), l: V(ARENA.x, 1.5, AZ - 6) }, { p: V(ARENA.x, 7, AZ + 18), l: V(ARENA.x, 1.5, AZ) }], // 動物醒，走去出口
      [11, 16, { p: V(0, 2.4, 50), l: V(0, 1.6, 72) }, { p: V(0, 2.8, 45), l: V(0, 1.6, 60) }], // 跑過大門
      [16, 21, { p: V(2, 7, 27), l: V(19, 0.5, 10) }, { p: V(5, 5, 23), l: V(19, 0.5, 10) }], // 跑入地塊
      [21, 46, { p: V(7.3, 2.7, 15.5), l: V(7.3, 2.3, 9.5) }, { p: V(7.3, 2.6, 13.8), l: V(7.3, 2.3, 9.5) }], // Owner 多謝你
    ],
    captions: [
      [0.3, 'The Mutated Scientist Poacher is DEFEATED! ☀️'],
      [2.5, 'His Biome Bosses came out of the portal...'],
      [5, 'But the endangered animals woke up... and ran away from the Bosses!'],
      [11, 'They ran all the way home...'],
      [16, '...to YOUR plot! 🏡'],
      [21, ''],
    ],
    lines: [
      [22.3, 25, () => owner.head, 'You did it, Ranger! You saved them ALL! 🎉', 'owner'],
      [25.2, 28.2, () => owner.head, `Here is $${LAB_REWARD.toLocaleString('en-US')} for being the BEST ranger! 💰`, 'owner'],
      [28.4, 30.8, () => ranger.head, 'Thank you! 🐾', 'ranger'],
    ],
    update(t, dt) {
      // ---- 1. Boss 瞓低、傳送門 Boss 出嚟 ----
      if (t > 1.5 && once('portal')) {
        lab.bossPortal.target = 1;
        play('portal');
      }
      bosses.forEach((b, i) => {
        if (t < 2 + i * 0.35) return;
        b.g.visible = t < 11;
        let moving = 0;
        if (t < 8) moving = walk(b.g, b.goal, 5, dt) ? 1 : 0;
        else if (t < 11) moving = walk(b.g, V(b.goal.x * 0.6, 0, AZ + 4), 3, dt) ? 0.7 : 0; // 追住啲動物，但係追唔到
        animateRig(b, dt, t, moving);
      });
      // ---- 2. 動物醒咗，避開 Boss，由出口走 ----
      if (t > 5 && once('wake')) {
        play('magic');
        pets.forEach((a) => a.mark.userData.setLines([{ text: '❗', color: '#ffeb3b' }]));
      }
      if (t > 6.5 && once('run')) {
        play('rescue');
        pets.forEach((a) => a.mark.userData.setLines([{ text: '❤', color: '#ff4081' }]));
      }
      for (const a of pets) {
        let moving = 0;
        if (t > 5 && t < 6.5) a.model.position.y = Math.abs(Math.sin((t - 5) * 8 + a.i)) * 0.6; // 醒咗跳起
        else if (t >= 6.5 && t < 11) {
          a.model.position.y = 0;
          moving = walk(a.holder, V(EXIT.x + (a.i - 2.5) * 0.6, 0, EXIT.z), 8, dt) ? 1 : 0;
          a.holder.visible = a.holder.position.distanceTo(EXIT) > 1.6; // 入咗出口
        } else if (t >= 11 && t < 16) {
          if (once(`gate${a.i}`)) {
            a.holder.visible = true;
            a.holder.position.set((a.i - 2.5) * 1.4, 0, 80 + (a.i % 3) * 2.5);
          }
          moving = walk(a.holder, V((a.i - 2.5) * 1.1, 0, 30), 9.5, dt) ? 1 : 0;
        } else if (t >= 16) {
          if (once(`plot${a.i}`)) a.holder.position.set(1 + (a.i % 3) * 1.5, 0, 19 + Math.floor(a.i / 3) * 1.5);
          const atGate = a.holder.position.x >= 11.5;
          moving = walk(a.holder, atGate ? PLOT_SPOTS[a.i] : V(12.5, 0, 10.5), 7, dt) ? 1 : 0;
          if (!moving) {
            a.model.position.y = Math.abs(Math.sin(t * 5 + a.i)) * 0.5; // 開心到跳
            a.holder.rotation.y = Math.PI / 2 + Math.sin(t * 2 + a.i) * 0.3;
          }
        }
        a.model.userData.animate?.(t, moving);
      }
      // ---- 5. Owner 行過嚟多謝你、俾錢 ----
      if (t > 21 && once('meet')) {
        bosses.forEach((b) => (b.g.visible = false));
        lab.bossPortal.target = 0;
        ranger.g.visible = true;
        owner.label.visible = false;
        standUp(owner, 2.5, 9.5, -Math.PI / 2);
      }
      if (t > 21) {
        const moving = t < 23 && walk(owner.g, V(6.2, 0, 9.5), 2.4, dt);
        if (!moving) owner.g.rotation.y = -Math.PI / 2; // 面向 +x（你）
        const fake = { rig: owner, runPhase: ownerPhase.v };
        animateRig(fake, dt, t, moving ? 1 : 0);
        ownerPhase.v = fake.runPhase;
        if (t > 22.3 && t < 25) owner.arms[1].rotation.x = 2.6 + Math.sin(t * 10) * 0.3; // 揮手
        if (t > 25.2 && t < 27.5) owner.arms[1].rotation.x = 1.4; // 遞錢
      }
      if (t > 25.6 && t < 31) {
        if (once('cash')) {
          cash.visible = true;
          play('coin');
        }
        const k = Math.min(1, (t - 25.6) / 1.2);
        cash.position.set(6.9 + k * 0.8, 2.2 + Math.sin(k * Math.PI) * 0.8 + k * 1.6, 9.5);
        if (k >= 1 && once('paid')) {
          pay();
          play('coin');
          play('tierUp');
        }
      }
      if (t > 27 && t < 31) ranger.arms.forEach((arm) => (arm.rotation.x = Math.PI)); // 雙手舉高錢袋
      if (t > 31 && once('final')) play('magic');
      return null;
    },
    onDone() {
      pay(); // 跳過都照俾錢
      scene.remove(root);
      lab.bossPortal.target = 0;
      owner.label.visible = true;
      lieOnHammock();
      onDone?.();
    },
  });
}
