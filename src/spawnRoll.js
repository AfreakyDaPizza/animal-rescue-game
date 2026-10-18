// 野生動物「擲骰」：揀邊隻、幾重、咩稀有度（純計算，冇 THREE）
// animals.js 出動物、Discord bot 預測邊隻會出（discord-bot/）都用呢度，保證兩邊一樣

import { animalsInBiome, randomKg } from './data/animals.js';
import { randomRarity } from './data/balance.js';

// 固定隨機：同一個 seed 永遠出同一串數（F5 唔會換過；小朋友 2026-10-11）
export function seededRandom(text) {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// 用 Math.random（spawnAnimal 會先換做 seed 版）；sizeBoost：Giant Pets 活動嘅倍數（events.js boost.size）
// 回傳 { animal, kg, rarity, sizeMul }
export function rollWild(biome, animal = null, kg = null, rarity = null, sizeMul = null, sizeBoost = 1) {
  if (!animal) {
    const pool = animalsInBiome(biome);
    // 有固定稀有度嘅（Biome 7 魔法動物）：越稀有越少出
    const WEIGHT = { Common: 40, Rare: 25, Epic: 15, Legendary: 8, Mythic: 3, Eternal: 1 };
    const total = pool.reduce((n, a) => n + (a.rarity ? WEIGHT[a.rarity] : 10), 0);
    let roll = Math.random() * total;
    animal = pool.find((a) => (roll -= a.rarity ? WEIGHT[a.rarity] : 10) < 0) || pool[0];
  }
  // Giant Pets 活動：變大 3 倍（重量都 ×3）
  sizeMul = sizeMul ?? (sizeBoost > 1 ? sizeBoost : null);
  kg = kg ?? (sizeMul ? Math.round(randomKg(animal) * sizeMul * 10) / 10 : randomKg(animal));
  rarity = animal.rarity || (rarity ?? randomRarity()); // 魔法動物：固定稀有度
  if (rarity === 'Eternal' && !sizeMul && Math.random() < 0.03) sizeMul = 3; // 小朋友：Eternal 有 3% 機會係巨型
  return { animal, kg, rarity, sizeMul };
}

// 用 seed 擲一次（唔掂 Math.random）
export function rollSeeded(seed, biome, rarity = null, sizeBoost = 1) {
  const realRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    return rollWild(biome, null, null, rarity, null, sizeBoost);
  } finally {
    Math.random = realRandom;
  }
}
