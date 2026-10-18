// 預測而家每個生態區有邊隻野生動物（純計算，冇 THREE；Discord bot 用）
// 同 main.js 一樣嘅次序：每段白天開始（入夜）spawnAll，之後如果有 Giant Pets／Rare Rush／Troll Frenzy 活動就再換
// 假設玩家一直喺度玩；已經救咗嘅（state.takenSpawns）每個玩家唔同，呢度唔理

import { rollSeeded } from './spawnRoll.js';
import { eventStatus } from './events.js';
import { BIOMES } from './data/biomeList.js';
import { DAY_LENGTH, NIGHT_LENGTH } from './data/clock.js';

const CYCLE_MS = DAY_LENGTH * 1000; // 同 daynight.js 一樣：每 5 分鐘入夜
export { NIGHT_LENGTH };
const SPECIAL = ['Legendary', 'Mythic', 'Eternal'];
const seededPick = (text) => [...text].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7) / 4294967296; // 同 main.js 一樣

// 第幾段白天（同 daynight.js dayCycle 一樣，offset = 0）
export const cycleAt = (time) => Math.floor(time / CYCLE_MS);

export function predictSpawns(time = Date.now()) {
  const wild = BIOMES.map(() => []);
  const add = (biome, seed, rarity = null, sizeBoost = 1) => {
    const max = biome === 6 ? 3 : 1; // Biome 7 同時有 3 隻
    const r = rollSeeded(seed, biome, rarity, sizeBoost);
    wild[biome] = [...wild[biome], { seed, biome, ...r, special: SPECIAL.includes(r.rarity) }].slice(-max); // 太多就拎走最舊嗰啲
  };
  const spawnAll = (cycle) => {
    BIOMES.forEach((_, b) => add(b, `day${cycle}-b${b}`));
    for (const extra of ['x', 'y']) add(6, `day${cycle}-b6${extra}`);
  };
  const respawnWild = (tag, rare, sizeBoost) => BIOMES.forEach((_, b) => {
    const seed = `${tag}-b${b}`;
    add(b, seed, rare ? (seededPick(seed) < 0.3 ? 'Mythic' : 'Legendary') : null, sizeBoost);
  });

  const cycle = cycleAt(time);
  spawnAll(cycle);
  const ev = eventStatus(time);
  if (ev.active) {
    const tag = `${ev.key}-${ev.ev.id}`;
    if (ev.ev.id === 'rare' || ev.ev.id === 'troll') respawnWild(tag, true, 1);
    if (ev.ev.id === 'giant') for (let t = 0; t <= Math.floor(ev.into / 30); t++) respawnWild(`${tag}-t${t}`, false, 3); // 每 30 秒換一批
  }
  return {
    cycle,
    nextRefresh: (cycle + 1) * CYCLE_MS, // 下次入夜（全部換過）
    event: ev,
    biomes: BIOMES.map((info, b) => ({ biome: b, name: info.name, animals: wild[b] })),
  };
}
