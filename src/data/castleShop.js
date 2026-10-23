// 🛒 Witch Castle Shop (kid, Issue #14) — change the prices here!
// "Add a shop in the Witch's castle so you can buy ranger skins and boss skins."
// Everything costs ☠️ Skele Tokens (state.skeleTokens) — you get them in the 🗼 Witch Tower.
// (A Medium run to floor 10 gives about 100–150 Skele Tokens; floor 20 about 400+.)

// 👹 Boss skins (buy once, then press E next to any biome Boss to change its look)
export const CASTLE_BOSS_SKINS = [
  { id: 'demonic', name: 'Demonic Boss Skin', emoji: '👹', cost: 900, text: 'Horns, lava cracks and a fiery aura for any Boss!' },
  { id: 'meteoric', name: 'Meteoric Boss Skin', emoji: '🦹', cost: 600, text: 'A glowing space-rock meteor look for any Boss!' },
];

// 🧑 Ranger skins: special ones have their own price here…
export const CASTLE_RANGER_PRICES = {
  demonic: 500, // 😈 Demonic Ranger (also a rare Witch Tower prize)
};
// …and the normal Skin Shop skins cost (their 🎟️ Skin Token price) × this many Skele Tokens
export const CASTLE_RANGER_MULT = 3;
// Skins NOT sold here (🌠 Cosmic Meteor Ranger is only in the ☄️ Meteoric Shop)
export const CASTLE_RANGER_SKIP = ['ranger', 'cosmic'];
