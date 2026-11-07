// 7 個生態區嘅名同地板顏色（純資料，冇 THREE；world.js 同 Discord bot 都用）
export const BIOMES = [
  { name: 'Biome 1 - Deforestation Site', short: 'Deforestation Site', floor: 0x5f8a2e },
  { name: 'Biome 2 - Polluted Ocean', short: 'Polluted Ocean', floor: 0xd9c38f },
  { name: 'Biome 3 - Bird Poaching Site', short: 'Bird Poaching Site', floor: 0x3f6b2a },
  { name: 'Biome 4 - Arctic Meltdown', short: 'Arctic Meltdown', floor: 0xeef6fa },
  { name: "Biome 5 - Smuggler's Compound", short: "Smuggler's Compound", floor: 0x4a4550 },
  { name: 'Biome 6 - Mining Mountain', short: 'Mining Mountain', floor: 0x8a7f72 },
  { name: 'Biome 7 - Enchanted Kingdom', short: 'Enchanted Kingdom', floor: 0x9fa8da },
];

// 生態區大細（Issue #17 小朋友：「enlarge biome areas」→ 42×62 → 52×86）
// 放喺呢度（冇 import）：world.js、enchanted.js、labShape.js、meteorDecor.js 都用，唔會兜圈 import
export const BIOME_LENGTH = 86; // 每個生態區有幾長（z）
export const BIOME_HALF_W = 26; // 生態區通道一半闊（x：-26…26）
