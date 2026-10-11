// 教學關：一步一步帶新玩家玩一次（原稿：遊戲由教學開始，借第一隻動物，避開垃圾同污染空氣）
// 畫面左上有任務框；目標頭頂有一個跳下跳下嘅大箭咀；右上有方向箭咀
// 撳「Skip」或者 K 可以跳過

import * as THREE from 'three';
import { state, save } from './state.js';
import { PLOT } from './hub.js';
import { play } from './sound.js';

const $ = (id) => document.getElementById(id);

// 每一步：text = 任務；target(ctx) = 箭咀指住邊度；done(ctx) = 做完未
const STEPS = [
  {
    text: 'Welcome, Rescuer! 🐾 Walk with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> and look around with the mouse.',
    start: (ctx) => (ctx.startPos = ctx.camera.position.clone()),
    done: (ctx) => ctx.camera.position.distanceTo(ctx.startPos) > 4,
  },
  {
    text: 'Animals need a FAST rescuer! Stand on the <b>Treadmill</b> to train ⚡ Speed.',
    target: () => new THREE.Vector3(-25, 0, 7),
    start: () => (stepData.speed = state.speed),
    done: () => state.speed > stepData.speed,
  },
  {
    text: 'A SMART rescuer answers wildlife questions! Sit at the <b>Student Table</b> to train 🧠 IQ.',
    target: () => new THREE.Vector3(-14, 0, 7.2),
    start: () => (stepData.iq = state.iq),
    done: () => state.iq > stepData.iq,
  },
  {
    text: 'Time for your first rescue! Walk into <b>Biome 1 - Deforestation Site</b>.',
    target: () => new THREE.Vector3(0, 0, -6),
    done: (ctx) => ctx.camera.position.z < -3,
  },
  {
    text: 'Find the animal in the glowing circle and press <kbd>E</kbd> to borrow it. Watch out for rolling logs and smoke - jump with <kbd>Space</kbd>!',
    target: (ctx) => ctx.rescue.wild.find((w) => w.biome === 0)?.group.position,
    done: (ctx) => !!ctx.rescue.carrying,
  },
  {
    text: 'RUN back to the <b>Hub</b>! The Lumberjack will chase you. If he catches you, answer his question to escape!',
    target: () => new THREE.Vector3(0, 0, 4),
    start: () => (stepData.rescued = state.rescued),
    done: (ctx) => state.rescued > stepData.rescued || (!ctx.rescue.carrying && state.borrowed.length > 0),
    fail: (ctx) => !ctx.rescue.carrying && state.rescued <= stepData.rescued, // 冇咗隻動物：返去上一步
  },
  {
    text: 'You saved it! 🎉 Walk to a pink <b>Reproduce Machine</b> and press <kbd>E</kbd> to put your animal inside.',
    target: (ctx) => {
      const m = ctx.hub.machines.find((mm, i) => !state.machines[i]) || ctx.hub.machines[2];
      return new THREE.Vector3(m.x, 0, m.z - 1.5);
    },
    done: () => state.machines.some(Boolean) || state.pets.length > 0,
  },
  {
    text: 'The machine is working... 💗 (In the tutorial it is super fast!) When it says READY, press <kbd>E</kbd> to collect your pet.',
    target: (ctx) => {
      const i = state.machines.findIndex(Boolean);
      const m = ctx.hub.machines[i >= 0 ? i : 2];
      return new THREE.Vector3(m.x, 0, m.z - 1.5);
    },
    start: () => {
      // 教學：第一隻好快就繁殖完
      for (const rec of state.machines) if (rec) rec.endsAt = Math.min(rec.endsAt, Date.now() + 5000);
    },
    done: () => state.pets.length > 0,
  },
  {
    text: 'Your very own pet! Take it to the <b>Plot</b> gate and press <kbd>E</kbd>. Pets on your Plot earn 💰 money every second.',
    target: () => new THREE.Vector3(PLOT.minX - 1, 0, PLOT.gateZ),
    done: () => state.pets.some((p) => p.onPlot),
  },
  {
    text: '🏆 Tutorial complete! Use money to upgrade, rescue harder animals in further biomes, and fill your 📖 Index (<kbd>I</kbd>). Save all the animals!',
    start: () => {
      state.money += 100;
      stepData.finishAt = performance.now() + 9000;
    },
    done: () => performance.now() > stepData.finishAt,
  },
];

const stepData = {};
let arrow = null;

export function createTutorial(scene, deps) {
  const t = { ...deps, active: false, step: 0 };
  // 3D 大箭咀（指住目標）
  arrow = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffc400, emissiveIntensity: 2 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), mat);
  head.rotation.x = Math.PI; // 尖頭向下
  arrow.add(head);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), mat);
  shaft.position.y = 0.8;
  arrow.add(shaft);
  arrow.visible = false;
  scene.add(arrow);

  $('tutorial-skip').addEventListener('click', () => finish(t, true));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyK' && t.active) finish(t, true);
  });
  return t;
}

// 開始（新玩家先會開始；救過動物嘅舊玩家唔使）
export function startTutorial(t) {
  if (state.tutorialDone || state.rescued > 0) {
    state.tutorialDone = true;
    return;
  }
  t.active = true;
  t.step = state.tutorialStep || 0;
  enterStep(t);
  $('tutorial').hidden = false;
}

function enterStep(t) {
  const step = STEPS[t.step];
  step.start?.(t);
  $('tutorial-step').textContent = `Tutorial ${t.step + 1} / ${STEPS.length}`;
  $('tutorial-text').innerHTML = step.text;
  const box = $('tutorial');
  box.classList.remove('pop');
  void box.offsetWidth;
  box.classList.add('pop');
  state.tutorialStep = t.step;
}

function finish(t, skipped) {
  t.active = false;
  state.tutorialDone = true;
  arrow.visible = false;
  $('tutorial').hidden = true;
  $('tutorial-arrow').hidden = true;
  if (skipped) play('click');
  save();
}

// 每格畫面叫
export function updateTutorial(t, time) {
  if (!t.active) return;
  const step = STEPS[t.step];
  if (step.fail?.(t)) {
    t.step -= 1; // 冇咗隻動物：返去「借動物」嗰步
    enterStep(t);
    return;
  }
  if (step.done(t)) {
    play('ding');
    t.step += 1;
    if (t.step >= STEPS.length) {
      finish(t, false);
      return;
    }
    enterStep(t);
    return;
  }
  // 箭咀
  const target = step.target?.(t);
  if (target) {
    arrow.visible = true;
    arrow.position.set(target.x, (target.y || 0) + 3.2 + Math.sin(time * 4) * 0.3, target.z);
    arrow.rotation.y = time * 2;
    // 畫面上嘅方向箭咀（目標喺邊個方向、幾遠）
    const cam = t.camera;
    const fx = -Math.sin(cam.rotation.y);
    const fz = -Math.cos(cam.rotation.y);
    const tx = target.x - cam.position.x;
    const tz = target.z - cam.position.z;
    const angle = Math.atan2(fx * tz - fz * tx, fx * tx + fz * tz);
    const el = $('tutorial-arrow');
    el.hidden = false;
    el.querySelector('span').style.transform = `rotate(${Math.round((angle * 180) / Math.PI)}deg)`;
    el.querySelector('small').textContent = `${Math.round(Math.hypot(tx, tz))} m`;
  } else {
    arrow.visible = false;
    $('tutorial-arrow').hidden = true;
  }
}
