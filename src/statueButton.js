// 🦏 犀牛像後面嘅掣（小朋友 2026-10-18）：撳一下 → Speed 夠打最後一個生態區、錢夠升晒所有級，但係 IQ 變 0
import * as THREE from 'three';
import { state } from './state.js';
import { BOSSES, upgradeCost, MAX_TRAINING_LEVEL, MACHINE_LEVELS, plotUpgradeCost, PLOT_MAX_UPGRADES } from './data/balance.js';
import { addCollider } from './world.js';

// 犀牛像喺 (-6, 56)，面向 +z（大門）；後面 = -z 嗰邊
export const STATUE_BUTTON = { x: -6, z: 53.4 };

export function buildStatueButton(scene) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 0.8 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), stone);
  post.position.y = 0.35;
  g.add(post);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0x5d0000, emissiveIntensity: 0.6 }));
  cap.position.y = 0.75;
  g.add(cap);
  g.position.set(STATUE_BUTTON.x, 0, STATUE_BUTTON.z);
  scene.add(g);
  addCollider(STATUE_BUTTON.x, STATUE_BUTTON.z, 0.35);
  return { g, cap, press: 0 };
}

// 由而家嘅等級升到最高要幾多錢
export function moneyForAllUpgrades() {
  let total = 0;
  for (const key of ['treadmillLevel', 'tableLevel']) for (let l = state[key]; l < MAX_TRAINING_LEVEL; l++) total += upgradeCost(l);
  for (let i = state.machineLevel; i < MACHINE_LEVELS.length; i++) total += MACHINE_LEVELS[i].cost;
  for (let l = state.plotLevel; l < PLOT_MAX_UPGRADES; l++) total += plotUpgradeCost(l);
  return total;
}

export function pressStatueButton(btn) {
  const money = moneyForAllUpgrades();
  const speed = BOSSES[BOSSES.length - 1].speed; // 最後一個生態區 Boss 要嘅 Speed
  state.money += money;
  state.speed = Math.max(state.speed, speed);
  state.iq = 0;
  btn.press = 0.25;
  return { money, speed };
}

export function updateStatueButton(btn, dt) {
  btn.press = Math.max(0, btn.press - dt);
  btn.cap.position.y = btn.press > 0 ? 0.7 : 0.75;
}

export const nearStatueButton = (pos) => Math.hypot(pos.x - STATUE_BUTTON.x, pos.z - STATUE_BUTTON.z) < 1.6;
