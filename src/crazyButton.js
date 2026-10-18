// 🤪 Crazy Pet Frenzy（小朋友 2026-10-18）：秘密沙灘一個好隱蔽嘅掣
// 撳咗：CRAZY_FRENZY_SECONDS 秒入面，每個生態區都係瘋狂寵物（Legendary／Mythic、成日係巨型、有時有 Fire／Eclipse）
// 遊戲係單人（冇伺服器），所以只係影響撳嘅人自己部機；冷卻時間存喺 state.crazyReadyAt
// 個掣：沙灘南邊嗰嚿大石（本地座標 57, 66）後面，半埋喺沙入面，同沙一樣色；冇牌，要好近（1.6 米）先有 E

import * as THREE from 'three';
import { BEACH_OFFSET } from './labShape.js';
import { spawnAnimal } from './animals.js';
import { animalsInBiome } from './data/animals.js';
import { addFireAura } from './fireAura.js';
import { BIOMES, kingdom } from './world.js';
import { play } from './sound.js';
import { announce, popup } from './hud.js';
import { state, save } from './state.js';
import { CRAZY_FRENZY_SECONDS, CRAZY_COOLDOWN_MINUTES, CRAZY_MYTHIC_CHANCE, CRAZY_GIANT_CHANCE, CRAZY_MUTATION_CHANCE } from './data/balance.js';

export const CRAZY_BUTTON = { x: 57.7 + BEACH_OFFSET, z: 64.3 };
const REFILL_EVERY = 2.5; // 救走咗／俾入夜或者活動換走咗：幾秒之後補返一隻瘋狂寵物

export function createCrazyButton(scene) {
  const g = new THREE.Group();
  g.position.set(CRAZY_BUTTON.x, 0, CRAZY_BUTTON.z);
  const sand = new THREE.MeshStandardMaterial({ color: 0xe6d3a3, roughness: 0.95, flatShading: true });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sand);
  mound.scale.y = 0.35;
  g.add(mound);
  // 粒掣：沙色，頂有一點好細嘅粉紅（要好留心先見到）
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd9c38f, roughness: 0.6, emissive: 0xff4081, emissiveIntensity: 0.05 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 14), capMat);
  cap.position.y = 0.15;
  g.add(cap);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff80ab, emissive: 0xff4081, emissiveIntensity: 0.6 }));
  dot.position.y = 0.2;
  g.add(dot);
  // 幾粒細貝殼擋住少少
  for (const [x, z, r] of [[0.35, 0.1, 0.07], [-0.3, 0.2, 0.06], [0.05, -0.35, 0.08]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff8e1 }));
    s.scale.y = 0.5;
    s.position.set(x, 0.04, z);
    g.add(s);
  }
  scene.add(g);
  return { g, cap, capMat, press: 0, until: 0, refill: 0, debug: false };
}

const active = (cb) => Date.now() < cb.until;

// 一隻瘋狂寵物（Biome 7 動物有固定稀有度：揀 Legendary 或以上嗰啲）
function spawnCrazy(rescue, b) {
  const mythic = Math.random() * 100 < CRAZY_MYTHIC_CHANCE;
  let animal = null;
  if (b === 6) {
    const pool = animalsInBiome(6).filter((a) => ['Legendary', 'Mythic', 'Eternal'].includes(a.rarity));
    animal = pool[Math.floor(Math.random() * pool.length)];
  }
  const sizeMul = Math.random() * 100 < CRAZY_GIANT_CHANCE ? 3 : null;
  const w = spawnAnimal(rescue, b, animal, null, mythic ? 'Mythic' : 'Legendary', { sizeMul });
  if (!w) return null;
  w.crazy = true;
  if (Math.random() * 100 < CRAZY_MUTATION_CHANCE) {
    w.mutation = Math.random() < 0.5 ? 'fire' : 'eclipse';
    addFireAura(w.model, w.mutation);
  }
  return w;
}

// 每個生態區（冇瘋狂寵物嘅）出一隻
function fillBiomes(rescue) {
  const list = [];
  BIOMES.forEach((_, b) => {
    if (b === 6 && !kingdom.open) return; // 魔法王國未開：唔出
    if (rescue.wild.some((w) => w.biome === b && w.crazy)) return;
    const w = spawnCrazy(rescue, b);
    if (w) list.push(w);
  });
  return list;
}

// E 掣：要好近先見到
export function crazyInteraction(cb, pos, rescue) {
  if (Math.hypot(pos.x - CRAZY_BUTTON.x, pos.z - CRAZY_BUTTON.z) > 1.6) return null;
  return { prompt: '<kbd>E</kbd> Press the strange little button... 🤔', action: () => pressCrazy(cb, rescue) };
}

export function pressCrazy(cb, rescue) {
  cb.press = 1;
  play('click');
  if (active(cb)) return popup('🤪 The CRAZY PET FRENZY is already on! Go go go!');
  const left = (state.crazyReadyAt || 0) - Date.now();
  if (left > 0 && !cb.debug) return popup(`🔋 The button is recharging... ${Math.ceil(left / 60000)} min`);
  cb.until = Date.now() + CRAZY_FRENZY_SECONDS * 1000;
  cb.refill = REFILL_EVERY;
  state.crazyReadyAt = Date.now() + CRAZY_COOLDOWN_MINUTES * 60000;
  save();
  play('drumroll');
  setTimeout(() => play('magic'), 1700);
  announce(`🤪 CRAZY PET FRENZY! For ${CRAZY_FRENZY_SECONDS} seconds every biome is full of crazy pets!`);
  setTimeout(() => popup('Only Legendary and Mythic! Some are GIANT, some are 🔥 Fire or 🌑 Eclipse! Follow the light beams!'), 1800);
  const list = fillBiomes(rescue);
  const names = list.slice(0, 3).map((w) => `${w.sizeMul ? 'GIANT ' : ''}${w.rarity} ${w.animal.name}`);
  setTimeout(() => popup(`✨ ${names.join(', ')} and more!`), 4500);
}

// 入夜／活動換晒動物之後即刻補返（main.js spawnAll、respawnWild 用）
export function refillCrazy(cb, rescue) {
  if (cb && active(cb)) fillBiomes(rescue);
}

// 每格畫面：個掣彈返上嚟、活動期間補返瘋狂寵物（救走咗或者入夜 spawnAll 換走咗），完咗就變返正常（onEnd）
export function updateCrazy(cb, dt, rescue, onEnd) {
  cb.press = Math.max(0, cb.press - dt * 3);
  cb.cap.position.y = 0.15 - cb.press * 0.06;
  cb.capMat.emissiveIntensity = active(cb) ? 0.6 + Math.sin(Date.now() / 120) * 0.4 : 0.05;
  if (cb.until && !active(cb)) {
    cb.until = 0;
    announce('🤪 The CRAZY PET FRENZY is over!');
    onEnd?.();
    return;
  }
  if (!active(cb)) return;
  cb.refill -= dt;
  if (cb.refill <= 0) {
    cb.refill = REFILL_EVERY;
    fillBiomes(rescue);
  }
}
