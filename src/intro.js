// 開場動畫：動物開開心心 → Boss 衝出嚟用籠捉走佢哋 → 畫面變黑：「Save all the animals to save the world...」
// 撳任何掣／滑鼠跳過

import * as THREE from 'three';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { buildBossRig, animateRig } from './bosses.js';
import { makeLabel } from './signs.js';
import { play } from './sound.js';

const LENGTH = 17; // 秒
const $ = (id) => document.getElementById(id);

export function createIntro(scene, camera) {
  const root = new THREE.Group();
  scene.add(root);

  // 12 隻隨機動物喺 Hub 中間玩
  const pool = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 12);
  const animals = pool.map((animal, i) => {
    const model = buildAnimalModel(animal);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(Math.min(1, 2.2 / Math.max(size.x, size.y, size.z)));
    if (model.userData.move === 'fly') model.userData.flying = false;
    const g = new THREE.Group();
    g.add(model);
    const a = (i / 12) * Math.PI * 2;
    g.position.set(Math.cos(a) * 7, 0, 13 + Math.sin(a) * 6);
    root.add(g);
    const heart = makeLabel([{ text: '❤', color: '#ff4081' }], 0.5);
    heart.position.y = new THREE.Box3().setFromObject(model).max.y + 0.6;
    g.add(heart);
    return { g, model, heart, target: g.position.clone(), wait: Math.random() * 2, caged: false, cage: null, boss: null };
  });

  // 6 個 Boss 喺入口後面等
  const bosses = [0, 1, 2, 3, 4, 5].map((i) => {
    const rig = buildBossRig(i);
    const group = new THREE.Group();
    group.add(rig.g);
    group.position.set(-12 + i * 4.8, 0, -18 - (i % 2) * 3);
    root.add(group);
    // 每個 Boss 負責捉兩隻
    return { rig, group, runPhase: 0, targets: [animals[i * 2], animals[i * 2 + 1]], step: 0 };
  });

  const intro = { active: true, time: 0, root, animals, bosses, camera, scene, stage: 0 };

  const overlay = $('intro');
  overlay.hidden = false;
  const skip = () => finish(intro);
  intro.skipHandler = skip;
  window.addEventListener('keydown', skip, { once: true });
  overlay.addEventListener('click', skip, { once: true });
  return intro;
}

function caption(text) {
  const el = $('intro-caption');
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// 籠：由天跌落嚟罩住動物
function makeCage() {
  const g = new THREE.Group();
  const bar = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), bar);
      a.position.set(-1 + i * 0.5, 1.2, s * 1);
      g.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), bar);
      b.position.set(s * 1, 1.2, -1 + i * 0.5);
      g.add(b);
    }
  }
  for (const y of [0.05, 2.4]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 2.1), bar);
    plate.position.y = y;
    g.add(plate);
  }
  return g;
}

export function updateIntro(intro, dt) {
  if (!intro.active) return;
  intro.time += dt;
  const t = intro.time;

  // 鏡頭：喺 Hub 上面慢慢轉
  const angle = -0.6 + t * 0.06;
  intro.camera.position.set(Math.sin(angle) * 22, 11 - Math.min(t, 10) * 0.3, 8 + Math.cos(angle) * 22);
  intro.camera.lookAt(0, 1, 6);

  // 第 1 幕：開開心心
  if (t < 4.5) caption('Once upon a time, the animals lived happily together...');
  else if (t < 8) caption('But then... the BOSSES came!');
  else if (t < 12) caption('They captured the animals and took them away...');
  if (t > 4.5 && intro.stage === 0) {
    intro.stage = 1;
    play('alarm');
  }

  for (const a of intro.animals) {
    if (a.caged) {
      a.model.userData.animate(t, 0);
      continue;
    }
    // 行嚟行去（Boss 嚟咗就走快啲、驚）
    const scared = t > 4.5;
    if (a.wait > 0 && !scared) {
      a.wait -= dt;
      a.model.userData.animate(t, 0);
    } else {
      const d = a.target.clone().sub(a.g.position);
      d.y = 0;
      if (d.length() < 0.3) {
        a.target.set((Math.random() - 0.5) * 16, 0, 8 + Math.random() * 12);
        a.wait = scared ? 0 : 1 + Math.random() * 2;
      } else {
        a.g.position.add(d.normalize().multiplyScalar(dt * (scared ? 4 : 1.3)));
        a.model.rotation.y = Math.atan2(-d.x, -d.z);
      }
      a.model.userData.animate(t, 1);
    }
  }

  // Boss：衝去捉動物，籠由天跌落，再拖返去入口
  for (const b of intro.bosses) {
    let moving = 0;
    if (t > 4.5) {
      const target = b.targets[b.step];
      const goal = target && !target.caged ? target.g.position : new THREE.Vector3(b.group.position.x, 0, -25);
      const d = goal.clone().sub(b.group.position);
      d.y = 0;
      if (d.length() > 1.6 || !target || target.caged) {
        b.group.position.add(d.normalize().multiplyScalar(dt * (target && !target.caged ? 7 : 3)));
        b.group.rotation.y = Math.atan2(-d.x, -d.z);
        moving = 1;
      } else if (target && !target.caged) {
        // 捉到！籠跌落嚟，動物變喊
        target.caged = true;
        target.cage = makeCage();
        target.cage.position.y = 8;
        target.g.add(target.cage);
        target.heart.userData.setLines([{ text: '😢', color: '#90caf9' }]);
        target.boss = b;
        play('hit');
        b.step += 1;
      }
    }
    animateRig(b, dt, t, moving);
  }
  // 籠跌落；之後跟住 Boss 拖走
  for (const a of intro.animals) {
    if (!a.cage) continue;
    a.cage.position.y = Math.max(0, a.cage.position.y - dt * 14);
    if (a.cage.position.y === 0 && a.boss) {
      const behind = a.boss.group.position.clone().add(new THREE.Vector3(0, 0, 1.8).applyQuaternion(a.boss.group.quaternion));
      a.g.position.lerp(behind, Math.min(1, dt * 3));
    }
  }

  // 第 2 幕：變黑 + 大字
  const fade = $('intro-fade');
  if (t > 11.5) {
    fade.style.opacity = Math.min(1, (t - 11.5) / 1.2);
    $('intro-caption').classList.remove('show');
  }
  if (t > 12.8) $('intro-final').classList.add('show');
  if (t > LENGTH) finish(intro);
}

function finish(intro) {
  if (!intro.active) return;
  intro.active = false;
  intro.scene.remove(intro.root);
  window.removeEventListener('keydown', intro.skipHandler);
  $('intro').hidden = true;
  intro.onDone?.();
}
