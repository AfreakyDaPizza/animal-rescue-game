// 😈 Witch Tower 獎品寵物（小朋友 Issue #11）
// - 5 隻 Demonic Chest 寵物（淨係開 😈 Demonic Chest 先有）：Imp、Toro、Demonic Whale、Skeleton Horseman、Lava Cerberus
// - 2 隻新蛋寵物（Witch Tower 送蛋 → 喺 🪦 Egg Graveyard 孵）：🌋 Lava Bloom（Legendary）、🎃 Pumpkgrim（Mythic）
// 唔放入 HALLOWEEN_PETS：嗰個 list 俾野生蛋同魚竿抽，呢 7 隻淨係 Witch Tower 先拎得到
// biome 9 = 同 Abandoned Manor 一樣嘅底價（俾錢、Index 新品種獎金用）
// 機會率喺 balance.js（DEMONIC_CHEST_DROPS），小朋友可以自己改
import { DEMONIC_CHEST_DROPS, LAVA_BLOOM_HATCH, PUMPKGRIM_HATCH } from './balance.js';

const DEMON = 'Demonic pet (not a real animal!)';

export const DEMONIC_CHEST_PETS = [
  { name: 'Imp', rarity: 'Common', kg: [3, 8], emoji: '😈',
    fact: 'A cheeky little imp with tiny horns and a pointy tail. It plays pranks, but it always says sorry!' },
  { name: 'Toro', rarity: 'Rare', kg: [400, 900], emoji: '🐂',
    fact: 'A lava bull with glowing hooves. Real wild cattle like the Gaur and the Banteng are Vulnerable or Endangered.' },
  { name: 'Demonic Whale', rarity: 'Epic', kg: [30000, 60000], emoji: '🐋',
    fact: 'It swims through rivers of lava and blows fire bubbles. Real whales need clean, quiet oceans to sing to each other.' },
  { name: 'Skeleton Horseman', rarity: 'Legendary', kg: [500, 900], emoji: '🏇',
    fact: 'A friendly skeleton knight on a fire horse. It rides around the Witch Tower to keep everyone safe.' },
  { name: 'Lava Cerberus', rarity: 'Mythic', kg: [600, 1200], emoji: '🐕',
    fact: 'Three happy puppy heads, one big lava body! Each head wants its own belly rub.' },
].map((p) => ({ ...p, biome: 9, demonic: true, chest: 'demonic', status: DEMON, magical: true, halloween: true }));

// 🥚 Witch Tower 蛋：喺 Egg Graveyard 孵（halloweenEggs.js 讀 hatchSeconds）
export const DEMONIC_EGG_PETS = [
  { name: 'Lava Bloom', rarity: 'Legendary', hatchSeconds: LAVA_BLOOM_HATCH, kg: [80, 160], emoji: '🌋',
    fact: 'A flower that grows in volcano rock. Its petals glow like lava and it smells like toasted marshmallows!' },
  { name: 'Pumpkgrim', rarity: 'Mythic', hatchSeconds: PUMPKGRIM_HATCH, kg: [60, 110], emoji: '🎃',
    fact: 'A gentle grim reaper with a pumpkin head. Its scythe is made of candy and it guides lost ghosts home.' },
].map((p) => ({ ...p, biome: 9, demonic: true, towerEgg: true, status: DEMON, magical: true, halloween: true }));

export const DEMONIC_PETS = [...DEMONIC_CHEST_PETS, ...DEMONIC_EGG_PETS];

// 抽一次 Demonic Chest（rand 0–1）：回傳 { name, rarity }
// 小朋友個 list 加埋 = 105%（65 + 20 + 15 + 4.5 + 0.5）：用「佔總數幾多」計，等於全部按比例縮返做 100%
const TOTAL = DEMONIC_CHEST_DROPS.reduce((n, d) => n + d.chance, 0);
export const demonicChestPercent = (d) => Math.round((d.chance / TOTAL) * 1000) / 10; // 真正機會率（%）
export function rollDemonicChest(rand = Math.random()) {
  let roll = rand * TOTAL;
  return { ...(DEMONIC_CHEST_DROPS.find((d) => (roll -= d.chance) < 0) || DEMONIC_CHEST_DROPS[0]) };
}
export { DEMONIC_CHEST_DROPS };
