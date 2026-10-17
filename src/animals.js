// 動物：喺生態區出現、借、抱住返 Hub、跌咗返去生態區

import * as THREE from 'three';
import { addFireAura } from './fireAura.js';
import { animalsInBiome, randomKg, formatKg, kgScale, findAnimal } from './data/animals.js';
import { INDEX_NEW_SPECIES_REWARD, INDEX_BIOME_COMPLETE_REWARD, petMoney, randomRarity, rarityInfo } from './data/balance.js';
import { buildAnimalModel } from './animalModels.js';
import { biomeRect, KINGDOM_Y } from './world.js';
import { SUMMIT } from './biomes.js';
import { boost } from './events.js';
import { applyPetSkin } from './skins.js';
import { makeLabel } from './signs.js';
import { state } from './state.js';

export { buildAnimalModel };

const BORROW_DISTANCE = 3.5; // 行到幾近先借得

export function createRescue(scene, camera) {
  return {
    scene,
    camera,
    wild: [],       // 而家喺生態區等緊救嘅動物
    carrying: null, // 抱緊邊隻（{ animal, model }）
    holding: null,  // 快捷欄揀咗、拎喺手嘅嘢（{ name, model }）
  };
}

// 喺某個生態區放一隻動物（入夜就叫一次）；animal／kg／rarity 唔俾就隨機揀
// 回傳嗰隻動物嘅資料（main.js 用嚟宣佈 Legendary／Mythic）
// 固定隨機：同一個 seed 永遠出同一隻動物（F5 唔會換過；小朋友 2026-10-11）
function seededRandom(text) {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// seed：呢隻動物嘅「身份」（例如「第 123 段白天 · Biome 2」）；救咗嘅就唔再出
export function spawnAnimal(rescue, biome, animal = null, kg = null, rarity = null, { seed = null, sizeMul = null } = {}) {
  // 每個生態區得 1 隻；Biome 7 魔法王國可以同時有 3 隻（小朋友：最少 2 隻）
  const MAX = biome === 6 ? 3 : 1;
  const same = rescue.wild.filter((w) => w.biome === biome);
  const drop = same.slice(0, Math.max(0, same.length - (MAX - 1))); // 太多就拎走最舊嗰啲
  rescue.wild = rescue.wild.filter((w) => {
    if (!drop.includes(w)) return true;
    rescue.scene.remove(w.group);
    return false;
  });
  if (seed && state.takenSpawns.includes(seed)) return null; // 已經救咗
  const realRandom = Math.random;
  if (seed) Math.random = seededRandom(seed);
  try {
    return makeWild(rescue, biome, animal, kg, rarity, seed, sizeMul);
  } finally {
    Math.random = realRandom;
  }
}

function makeWild(rescue, biome, animal, kg, rarity, seed, sizeMul) {

  if (!animal) {
    const pool = animalsInBiome(biome);
    // 有固定稀有度嘅（Biome 7 魔法動物）：越稀有越少出
    const WEIGHT = { Common: 40, Rare: 25, Epic: 15, Legendary: 8, Mythic: 3, Eternal: 1 };
    const total = pool.reduce((n, a) => n + (a.rarity ? WEIGHT[a.rarity] : 10), 0);
    let roll = Math.random() * total;
    animal = pool.find((a) => (roll -= a.rarity ? WEIGHT[a.rarity] : 10) < 0) || pool[0];
  }
  // Giant Pets 活動：變大 3 倍（重量都 ×3）
  sizeMul = sizeMul ?? (boost.size > 1 ? boost.size : null);
  kg = kg ?? (sizeMul ? Math.round(randomKg(animal) * sizeMul * 10) / 10 : randomKg(animal));
  rarity = animal.rarity || (rarity ?? randomRarity()); // 魔法動物：固定稀有度
  if (rarity === 'Eternal' && !sizeMul && Math.random() < 0.03) sizeMul = 3; // 小朋友：Eternal 有 3% 機會係巨型
  const info = rarityInfo(rarity);
  const special = rarity === 'Legendary' || rarity === 'Mythic' || rarity === 'Eternal';
  const rect = biomeRect(biome);

  const group = new THREE.Group();
  const model = buildAnimalModel(animal);
  // Giant Pets ×3、Big Pet Frenzy ×10000（畫面上最大 60 米，大過成條生態區；再大鏡頭會鑽咗入隻動物個身入面乜都睇唔到）
  const baseH = model.userData.height || 1;
  const sizeK = Math.min(kgScale({ name: animal.name, kg }) * (sizeMul || 1), 60 / baseH);
  model.scale.multiplyScalar(sizeK); // 越重越大隻
  group.add(model);

  // 腳下發光嘅圈，遠遠都見到
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.9, 40),
    new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
  // 一條光柱，喺入口都望到動物喺邊
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(special ? 1.2 : 0.4, special ? 1.2 : 0.4, special ? 80 : 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: special ? info.color : 0xffd54f, transparent: true, opacity: special ? 0.35 : 0.18, depthWrite: false, fog: false }),
  );
  beam.position.y = special ? 40 : 15; // Legendary／Mythic 有條好高嘅彩色光柱，喺 Hub 都望到
  group.add(beam);

  // 頭頂：名 + 重量 + 每秒賺幾多錢（越重、越遠嘅生態區越多）
  const label = makeLabel([
    { text: animal.name },
    { text: `${special ? '★ ' : ''}${rarity}${special ? ' ★' : ''}${sizeMul ? ` · 🔥 x${sizeMul}` : ''}`, color: info.color },
    { text: `${formatKg(kg)} · $${petMoney(kg, biome, rarity).toLocaleString('en-US')}/s`, color: '#76ff03' },
  ]);
  label.position.y = model.userData.height * sizeK + 0.8;
  group.add(label);

  // 放喺生態區上半部（近 Boss），要走得快先救到；會喺附近行嚟行去
  const half = (rect.maxX - rect.minX) / 2 - 3;
  let home = new THREE.Vector3((Math.random() * 2 - 1) * half, biome === 6 ? KINGDOM_Y : 0, rect.minZ + (biome === 6 ? 26 : 9) + Math.random() * (biome === 6 ? 40 : 16));
  let wander = 3;
  if (biome === 5) {
    // Mining Mountain：動物企喺山頂，要跳上去先救到
    // 山頂：喺頂層範圍入面行，唔會落山
    home = new THREE.Vector3(SUMMIT.x + (Math.random() - 0.5) * SUMMIT.halfX, SUMMIT.top, SUMMIT.z + (Math.random() - 0.5) * SUMMIT.halfZ);
    wander = 0;
  }
  group.position.copy(home);
  rescue.scene.add(group);

  const entry = { seed, sizeMul, reach: Math.min(BORROW_DISTANCE * Math.max(1, sizeK * 0.8), 40), animal, kg, rarity, special, biome, group, model, ring, beam, home, wander, onSummit: biome === 5, limitX: half + 1, target: home.clone(), wait: Math.random() * 3 };
  rescue.wild.push(entry);
  return entry;
}

// 最近嗰隻借得嘅動物（太遠就係 null）
export function nearestAnimal(rescue) {
  const p = rescue.camera.position;
  let best = null;
  let bestDist = Infinity;
  for (const w of rescue.wild) {
    const d = Math.hypot(w.group.position.x - p.x, w.group.position.z - p.z);
    const sameLevel = Math.abs(w.group.position.y - (p.y - 1.6)) < 2.5; // 要企喺同一個高度（例如山頂）
    if (d < w.reach && d < bestDist && sameLevel) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

// 一個縮細咗、拎喺手（畫面右下角）嘅模型
function handModel(animal) {
  const model = buildAnimalModel(animal);
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const realMax = Math.max(size.x, size.y, size.z); // 真實大細（頭頂 show 寵物要用）
  model.scale.multiplyScalar(0.4 / realMax);
  model.rotation.y = Math.PI * 0.8; // 第一身：側身對住玩家
  model.traverse((m) => (m.castShadow = false));
  const wrapper = new THREE.Group(); // 外面包多層：外層喺手度搖，入面隻動物自己郁
  wrapper.position.set(0.5, -0.5, -0.95);
  wrapper.add(model);
  wrapper.userData.inner = model;
  wrapper.userData.realMax = realMax;
  return wrapper;
}

// 借！動物由生態區消失，出現喺玩家手上
export function borrow(rescue, w) {
  rescue.scene.remove(w.group);
  rescue.wild = rescue.wild.filter((x) => x !== w);
  const held = handModel(w.animal);
  rescue.camera.add(held);
  rescue.carrying = { animal: w.animal, kg: w.kg, rarity: w.rarity, seed: w.seed, sizeMul: w.sizeMul, model: held };
}

// 答錯問題：動物跑返佢嘅生態區
export function loseAnimal(rescue) {
  const { animal, kg, rarity, seed, sizeMul, model } = rescue.carrying;
  model.removeFromParent(); // 可能喺手（鏡頭）或者頭頂（第三身）
  rescue.carrying = null;
  spawnAnimal(rescue, animal.biome, animal, kg, rarity, { seed, sizeMul });
  return animal;
}

// 返到 Hub：救援成功！回傳 { animal, kg, reward, biomeBonus }
export function deliver(rescue) {
  const { animal, kg, rarity, seed, sizeMul, model } = rescue.carrying;
  model.removeFromParent(); // 可能喺手（鏡頭）或者頭頂（第三身）
  rescue.carrying = null;
  if (seed) state.takenSpawns = [...state.takenSpawns, seed].slice(-60); // F5 都唔會再出

  state.rescued += 1;
  state.borrowed.push({ name: animal.name, biome: animal.biome, kg, rarity, sizeMul }); // 等繁殖機（巨型都記住）
  let reward = 0;
  let biomeBonus = 0;
  if (!state.indexFound.includes(animal.name)) {
    // 圖鑑第一次登記：有獎！
    state.indexFound.push(animal.name);
    reward = INDEX_NEW_SPECIES_REWARD[animal.biome];
    const biomeDone = animalsInBiome(animal.biome).every((a) => state.indexFound.includes(a.name));
    if (biomeDone) biomeBonus = INDEX_BIOME_COMPLETE_REWARD[animal.biome];
    state.money += reward + biomeBonus;
  }
  return { animal, kg, rarity, reward, biomeBonus };
}

// 快捷欄揀咗嘅嘢拎喺手（抱住救援動物時就收埋）
export function setHolding(rescue, name, fire = false) {
  const show = rescue.carrying ? null : name;
  const key = show && fire ? `${show}#fire` : show; // 🔥 Fire 寵物要換過有火嘅模型
  if ((rescue.holding?.key ?? rescue.holding?.name ?? null) === key) return;
  if (rescue.holding) rescue.holding.model.removeFromParent(); // 可能喺手（鏡頭）或者頭頂（第三身）
  rescue.holding = null;
  if (show) {
    const model = handModel(findAnimal(show));
    applyPetSkin(model, state.petSkin); // 寵物皮膚
    if (fire) addFireAura(model);
    rescue.camera.add(model);
    rescue.holding = { name: show, key, model };
  }
}

// 每格畫面：動物喺附近行嚟行去（有腳步動畫）、個圈閃下閃下、手上嘅嘢輕輕搖
// walking：玩家行緊路（手上嘅嘢搖多啲）
export function updateRescue(rescue, dt, time, walking = false) {
  for (const w of rescue.wild) {
    let moving = 0;
    if (w.wait > 0) w.wait -= dt;
    else {
      const dx = w.target.x - w.group.position.x;
      const dz = w.target.z - w.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        // 行到喇，休息一陣再揀過另一個位
        w.wait = 1.5 + Math.random() * 3;
        if (w.onSummit) w.target.set(SUMMIT.x + (Math.random() * 2 - 1) * SUMMIT.halfX, SUMMIT.top, SUMMIT.z + (Math.random() * 2 - 1) * SUMMIT.halfZ);
        else w.target.set(THREE.MathUtils.clamp(w.home.x + (Math.random() - 0.5) * 2 * w.wander, -w.limitX, w.limitX), w.home.y, w.home.z + (Math.random() - 0.5) * 2 * w.wander);
      } else {
        w.group.position.x += (dx / d) * dt * 1.3;
        w.group.position.z += (dz / d) * dt * 1.3;
        w.model.rotation.y = Math.atan2(-dx, -dz);
        moving = 1;
      }
    }
    w.model.userData.animate(time, moving);
    w.ring.material.opacity = 0.5 + Math.sin(time * 4) * 0.3;
    if (w.rarity === 'Mythic') {
      // Mythic 嘅光柱同圈會轉彩虹色
      w.beam.material.color.setHSL((time * 0.3) % 1, 1, 0.6);
      w.ring.material.color.setHSL((time * 0.3 + 0.5) % 1, 1, 0.6);
    }
  }
  const held = rescue.carrying?.model || rescue.holding?.model;
  if (held) {
    const sway = walking ? 1 : 0.3;
    held.position.y = -0.5 + Math.sin(time * 10) * 0.025 * sway;
    held.position.x = 0.5 + Math.sin(time * 5) * 0.02 * sway;
    held.userData.inner.userData.animate(time, 0);
  }
}
