// 🛒 Witch Castle Shop (kid, Issue #14) — change the prices here!
// "Add a shop in the Witch's castle so you can buy ranger skins and boss skins."
// Everything costs ☠️ Skele Tokens (state.skeleTokens) — you get them in the 🗼 Witch Tower.
// (A Medium run to floor 10 gives about 100–150 Skele Tokens; floor 20 about 400+.)

// Kid 2026-10-23: only DEMONIC skins here (no Meteoric / normal Skin Shop skins) + shards and chests

// 👹 Boss skins (buy once, then press E next to any biome Boss to change its look)
export const CASTLE_BOSS_SKINS = [
  { id: 'demonic', name: 'Demonic Boss Skin', emoji: '👹', cost: 900, text: 'Horns, lava cracks and a fiery aura for any Boss!' },
];

// 🔮 Shards + 🧰 chests (they go into your 🎒 Gears; you can buy lots at once)
export const CASTLE_ITEMS = [
  { gear: 'shard_demonic', cost: 250, text: 'Pick a pet: it becomes 😈 DEMONIC!' },
  { gear: 'shard_eclipse', cost: 150, text: 'Pick a pet: it becomes 🌑 ECLIPSE!' },
  { gear: 'demonicChest', cost: 40, text: 'Imp, Toro, Demonic Whale, Skeleton Horseman or Lava Cerberus! Open it from your hotbar.' },
];

// 🧑 Ranger skins: special ones have their own price here…
export const CASTLE_RANGER_PRICES = {
  demonic: 500, // 😈 Demonic Ranger (also a rare Witch Tower prize)
};
// (only the skins listed above are sold here — normal skins stay in the Hub Skin Shop)
