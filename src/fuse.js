// Fuse Machine（小朋友 2026-10-17 Issue #4）：揀 3 隻寵物溶埋做 1 隻 Fuse 先有嘅特別寵物
// 放入去嘅寵物越稀有，出 Mythic 嘅機會越高；新寵物每秒賺 = 3 隻嘅平均 × FUSE_MONEY_BONUS

import { state } from './state.js';
import { FUSE_PETS, itemMoney, randomKg } from './data/animals.js';
import { FUSE_OPEN_DATE, FUSE_RARITY_SCORE, FUSE_CHANCES_LOW, FUSE_CHANCES_HIGH, FUSE_MONEY_BONUS } from './data/balance.js';

// 今日（本地時間）係咪已經開咗
const today = () => new Date().toLocaleDateString('en-CA'); // 例如 2026-10-17
export const isFuseOpen = () => today() >= FUSE_OPEN_DATE || !!state.bigButton; // 橋下面個紅掣都開到（Issue #5）
export function daysUntilOpen() {
  const [y, m, d] = FUSE_OPEN_DATE.split('-').map(Number);
  const open = new Date(y, m - 1, d);
  return Math.max(0, Math.ceil((open - Date.now()) / 86400000));
}
// 「22 Oct」
export function openDateText() {
  const [y, m, d] = FUSE_OPEN_DATE.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// 放入呢 3 隻，每隻 Fuse 寵物有幾多 % 機會（未揀夠 3 隻就當 Common 計）
export function fuseChances(pets) {
  const score = [0, 1, 2].reduce((n, i) => n + (FUSE_RARITY_SCORE[pets[i]?.rarity || 'Common'] ?? 0), 0);
  const k = score / 12;
  const w = FUSE_CHANCES_LOW.map((lo, i) => lo + (FUSE_CHANCES_HIGH[i] - lo) * k);
  const total = w.reduce((a, b) => a + b, 0);
  return FUSE_PETS.map((p, i) => ({ name: p.name, rarity: p.rarity, emoji: p.emoji, chance: (w[i] / total) * 100 }));
}

// 溶！回傳新寵物（已經加咗入 state.pets，3 隻舊嘅已經拎走）
export function fusePets(pets) {
  if (pets.length !== 3 || pets.some((p) => !state.pets.includes(p))) return null;
  const chances = fuseChances(pets);
  let roll = Math.random() * 100;
  let pick = chances[0];
  for (const c of chances) {
    roll -= c.chance;
    if (roll < 0) {
      pick = c;
      break;
    }
  }
  const info = FUSE_PETS.find((p) => p.name === pick.name);
  const inputMoney = pets.reduce((n, p) => n + itemMoney(p), 0) / 3; // 平均（以前加埋，太勁）
  for (const p of pets) state.pets.splice(state.pets.indexOf(p), 1);
  const pet = {
    name: info.name, biome: info.biome, rarity: info.rarity, kg: randomKg(info), fuse: true, onPlot: false,
    money: Math.max(1, Math.round(inputMoney * FUSE_MONEY_BONUS[info.rarity])),
  };
  state.pets.push(pet);
  return pet;
}
