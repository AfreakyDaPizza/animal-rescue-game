// 🐕 Echo 隻狗嘅 Zombified Chest（小朋友 Issue #8）：用 🍬 Candy Corn 買，開出 Candy Corn 或者 4 隻新 Halloween 寵物
// 呢 4 隻寵物淨係喺箱度開到（唔喺蛋／釣魚度出），所以唔放入 HALLOWEEN_PETS（嗰個 list 俾蛋同魚竿抽）
// biome 9 = 同 Abandoned Manor 一樣嘅底價（俾錢用）
import { ZOMBIE_CHEST_DROPS, ZOMBIE_CHEST_CANDY } from './balance.js';

const SPOOKY = 'Halloween pet (not a real animal!)';

export const CHEST_PETS = [
  { name: 'Hollow Bat', rarity: 'Rare', kg: [2, 5], emoji: '🦇',
    fact: 'A fluffy little bat with a glowing hollow heart. Real bats eat lots of bugs and help flowers grow!' },
  { name: 'Scarecrow', rarity: 'Epic', kg: [15, 30], emoji: '🌾',
    fact: 'A friendly scarecrow with a glowing stitched smile. It is not scary at all - crows love to sit on its hat!' },
  { name: 'Pumpkin Golem', rarity: 'Legendary', kg: [400, 900], emoji: '🎃',
    fact: 'A strong stone golem with a jack-o-lantern head. It carries little pumpkins on its shoulders to keep them safe.' },
  { name: 'Soul Phantom', rarity: 'Mythic', kg: [30, 60], emoji: '👻',
    fact: 'The rarest chest pet! A shining spirit made of happy souls. It glows brighter when you are kind.' },
].map((p) => ({ ...p, biome: 9, hw: 'chest', chest: true, status: SPOOKY, magical: true, halloween: true }));

// 抽一次（rand 0–1）：回傳 { name, rarity, candy? }
export function rollZombieChest(rand = Math.random(), rand2 = Math.random()) {
  const total = ZOMBIE_CHEST_DROPS.reduce((n, d) => n + d.chance, 0);
  let roll = rand * total;
  const drop = ZOMBIE_CHEST_DROPS.find((d) => (roll -= d.chance) < 0) || ZOMBIE_CHEST_DROPS[0];
  if (drop.name !== 'Candy Corn') return { ...drop };
  const [lo, hi] = ZOMBIE_CHEST_CANDY;
  return { ...drop, candy: Math.round(lo + rand2 * (hi - lo)) };
}
