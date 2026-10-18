// 🤪 Crazy Pet Frenzy（小朋友 2026-10-18）：秘密沙灘一個好隱蔽嘅掣
// 撳咗：CRAZY_FRENZY_SECONDS 秒入面，每個生態區都係瘋狂寵物（Legendary／Mythic、成日係巨型、有時有 Fire／Eclipse）
// 有共享伺服器（src/config.js SHARED_SERVER_URL）：撳咗所有玩家一齊有；每 10 秒問一次伺服器有冇人撳咗
// 冇伺服器／連唔到：只係影響撳嘅人自己部機；冷卻時間存喺 state.crazyReadyAt
// 瘋狂寵物用活動開始時間做 seed：大家見到嘅寵物一樣
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
import { seededRandom } from './spawnRoll.js';
import { sharedOn, fetchShared, postCrazy } from './sharedEvents.js';
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
  return { g, cap, capMat, press: 0, until: 0, startedAt: 0, count: {}, refill: 0, debug: false, nextPoll: 0, polling: false, fails: 0, serverReadyAt: 0, rescue: null };
}

const active = (cb) => Date.now() < cb.until;

// 一隻瘋狂寵物（Biome 7 動物有固定稀有度：揀 Legendary 或以上嗰啲）
// seed = 活動開始時間 + 生態區 + 第幾隻：同一個活動，每個玩家出嘅寵物都一樣
function spawnCrazy(rescue, b, seed) {
  const rand = seededRandom(seed + '-pick');
  const mythic = rand() * 100 < CRAZY_MYTHIC_CHANCE;
  let animal = null;
  if (b === 6) {
    const pool = animalsInBiome(6).filter((a) => ['Legendary', 'Mythic', 'Eternal'].includes(a.rarity));
    animal = pool[Math.floor(rand() * pool.length)];
  }
  const sizeMul = rand() * 100 < CRAZY_GIANT_CHANCE ? 3 : null;
  const mutation = rand() * 100 < CRAZY_MUTATION_CHANCE ? (rand() < 0.5 ? 'fire' : 'eclipse') : null;
  const w = spawnAnimal(rescue, b, animal, null, mythic ? 'Mythic' : 'Legendary', { seed, sizeMul });
  if (!w) return null; // 呢隻已經救咗（state.takenSpawns）
  w.crazy = true;
  if (mutation) {
    w.mutation = mutation;
    addFireAura(w.model, w.mutation);
  }
  return w;
}

// 每個生態區（冇瘋狂寵物嘅）出一隻
function fillBiomes(cb, rescue) {
  const list = [];
  BIOMES.forEach((_, b) => {
    if (b === 6 && !kingdom.open) return; // 魔法王國未開：唔出
    if (rescue.wild.some((w) => w.biome === b && w.crazy)) return;
    for (let tries = 0; tries < 6; tries++) {
      const n = (cb.count[b] = (cb.count[b] ?? -1) + 1);
      const w = spawnCrazy(rescue, b, `crazy${cb.startedAt}-b${b}-n${n}`);
      if (w) {
        list.push(w);
        break;
      }
    }
  });
  return list;
}

// 開始（自己撳／伺服器話有人撳咗／冇伺服器）：startedAt 用嚟做 seed，until 係本機時間幾時完
function startFrenzy(cb, rescue, startedAt, until, remote) {
  cb.startedAt = startedAt;
  cb.until = until;
  cb.count = {};
  cb.refill = REFILL_EVERY;
  const secs = Math.max(1, Math.round((until - Date.now()) / 1000));
  play('drumroll');
  setTimeout(() => play('magic'), 1700);
  announce(remote ? '🌍 Another ranger pressed the secret button! CRAZY PET FRENZY!' : `🤪 CRAZY PET FRENZY! For ${secs} seconds every biome is full of crazy pets!`);
  setTimeout(() => popup(`${remote ? `${secs} seconds left! ` : ''}Only Legendary and Mythic! Some are GIANT, some are 🔥 Fire or 🌑 Eclipse! Follow the light beams!`), 1800);
  const list = fillBiomes(cb, rescue);
  const names = list.slice(0, 3).map((w) => `${w.sizeMul ? 'GIANT ' : ''}${w.rarity} ${w.animal.name}`);
  if (names.length) setTimeout(() => popup(`✨ ${names.join(', ')} and more!`), 4500);
}

// 伺服器嘅答案：有活動而本機未開始 → 開始（剩返幾耐就玩幾耐）
function applyShared(cb, data, mine) {
  if (!data) return;
  const skew = data.now - Date.now(); // 伺服器時間 − 本機時間
  cb.serverReadyAt = data.readyAt - skew;
  if (data.crazy && !active(cb) && cb.startedAt !== data.crazy.startedAt && cb.rescue) {
    state.crazyReadyAt = Math.max(state.crazyReadyAt || 0, cb.serverReadyAt); // 斷線都記住冷卻
    save();
    startFrenzy(cb, cb.rescue, data.crazy.startedAt, data.crazy.endsAt - skew, !mine);
  }
}

// E 掣：要好近先見到
export function crazyInteraction(cb, pos, rescue) {
  if (Math.hypot(pos.x - CRAZY_BUTTON.x, pos.z - CRAZY_BUTTON.z) > 1.6) return null;
  return { prompt: '<kbd>E</kbd> Press the strange little button... 🤔', action: () => pressCrazy(cb, rescue) };
}

export function pressCrazy(cb, rescue) {
  cb.press = 1;
  cb.rescue = rescue;
  play('click');
  if (active(cb)) return popup('🤪 The CRAZY PET FRENZY is already on! Go go go!');
  if (cb.pending) return;
  if (sharedOn() && !cb.debug) {
    cb.pending = true;
    postCrazy().then((data) => {
      cb.pending = false;
      if (!data) return pressLocal(cb, rescue); // 連唔到伺服器：自己部機玩
      applyShared(cb, data, true);
      if (!data.crazy) popup(`🔋 The button is recharging... ${Math.max(1, Math.ceil((data.readyAt - data.now) / 60000))} min`);
    });
    return;
  }
  pressLocal(cb, rescue);
}

// 冇伺服器（或者連唔到）：只係自己部機
function pressLocal(cb, rescue) {
  const left = (state.crazyReadyAt || 0) - Date.now();
  if (left > 0 && !cb.debug) return popup(`🔋 The button is recharging... ${Math.ceil(left / 60000)} min`);
  state.crazyReadyAt = Date.now() + CRAZY_COOLDOWN_MINUTES * 60000;
  save();
  startFrenzy(cb, rescue, Date.now(), Date.now() + CRAZY_FRENZY_SECONDS * 1000, false);
}

// 每 10 秒（個 tab 睇緊嘅時候）問伺服器；連唔到就慢慢問（最多 5 分鐘一次），唔會嘈
function pollShared(cb) {
  if (!sharedOn() || cb.polling || Date.now() < cb.nextPoll || document.visibilityState !== 'visible') return;
  cb.polling = true;
  fetchShared().then((data) => {
    cb.polling = false;
    cb.fails = data ? 0 : cb.fails + 1;
    cb.nextPoll = Date.now() + (data ? 10000 : Math.min(300000, 5000 * 2 ** cb.fails));
    applyShared(cb, data, false);
  });
}

// 入夜／活動換晒動物之後即刻補返（main.js spawnAll、respawnWild 用）
export function refillCrazy(cb, rescue) {
  if (cb && active(cb)) fillBiomes(cb, rescue);
}

// 每格畫面：個掣彈返上嚟、活動期間補返瘋狂寵物（救走咗或者入夜 spawnAll 換走咗），完咗就變返正常（onEnd）
export function updateCrazy(cb, dt, rescue, onEnd) {
  cb.rescue = rescue;
  pollShared(cb);
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
    fillBiomes(cb, rescue);
  }
}
