// 🌳 Witch's Skill Tree (kid, Issue #14) — change the numbers here!
// "Add a skill tree next to the witch, where you spend Skele Tokens on skills such as health, damage, loot luck and more."
//
// The tree stands next to the 🧙‍♀️ Witch in the Witch Castle courtyard. Press E to open it.
// Every skill has levels. Each level costs ☠️ Skele Tokens (state.skeleTokens) — the price goes up every level.
// A skill with a "parent" stays 🔒 locked until the parent skill is at least level "needs" (1 = just buy one level).
// Your levels are saved in state.skills = { id: level }.
//
// Each skill:
//   id      = the name the game uses (don't change it, the tower reads it)
//   name    = what the kid sees        emoji = the picture on the node
//   branch  = 'survival' | 'power' | 'fortune' (which colour / column of the tree)
//   parent  = the skill above it (null = a root at the bottom of the tree)
//   costs   = Skele Tokens for level 1, 2, 3... (how many numbers = the max level)
//   per     = how much one level gives (see "what it does")
//   text    = what one level does (shown in the panel; {v} becomes the total)
//
// Issue #15 (kid, 25 Oct): "add more skill tree upgrades for 2 weapon slots when first played and add more new upgrades"
//   🎒 Double Holster (slots) · 📦 Crate Finder (crateLuck) · 🔰 Shield Finder (shieldLuck)
//   🔥 Hot Hot Hot (fireDmg) · ⏳ Spell Master (spellCd) · 🔋 Big Pockets (mag)
//   The tree now has 3 rows: roots at the bottom, then 2 rows of branches. Where each node sits: LAYOUT in src/skillTree.js

export const SKILL_BRANCHES = {
  survival: { name: 'Survival', emoji: '❤️', color: '#ff5c8a' },
  power: { name: 'Power', emoji: '💥', color: '#ffab40' },
  fortune: { name: 'Fortune', emoji: '🍀', color: '#69f0ae' },
};

const ROOT = [10, 25, 50, 90, 150]; // 325 for all 5 levels
const LEAF = [20, 40, 75, 125, 200]; // 460 for all 5 levels
const FINDER = [30, 60, 100, 150, 220]; // 560 for all 5 levels (Shield Finder / Crate Finder)

export const SKILLS = [
  // ❤️ Survival
  { id: 'health', name: 'Max Hearts', emoji: '❤️', branch: 'survival', parent: null, costs: ROOT, per: 0.2, text: '+1 ❤️ heart in fights per level', show: (L) => `+${L} ❤️ heart${L === 1 ? '' : 's'}` },
  { id: 'regen', name: 'Heart Regen', emoji: '💗', branch: 'survival', parent: 'health', needs: 1, costs: LEAF, per: 0.2, text: 'Lost hearts come back 20% faster', show: (L) => `+${L * 20}% faster` },
  { id: 'shield', name: 'Starting Shield', emoji: '🛡️', branch: 'survival', parent: 'health', needs: 2, costs: [40, 90, 160], per: 1, text: 'Start every tower run with a 🛡️ shield that blocks 1 hit', show: (L) => `${L} 🛡️ block${L === 1 ? '' : 's'}` },
  { id: 'shieldLuck', name: 'Shield Finder', emoji: '🔰', branch: 'survival', parent: 'shield', needs: 1, costs: FINDER, per: 0.01, text: '+1% chance a beaten enemy drops a 🛡️ shield (normal chance is 4%)', show: (L) => `${4 + L}% shield drops` },
  // 💥 Power
  { id: 'damage', name: 'Spell Power', emoji: '💥', branch: 'power', parent: null, costs: ROOT, per: 0.1, text: 'Your magic weapons do 10% more damage', show: (L) => `+${L * 10}% damage` },
  { id: 'crit', name: 'Lucky Crit', emoji: '🎯', branch: 'power', parent: 'damage', needs: 1, costs: LEAF, per: 0.05, text: '5% chance for a ×1.5 CRIT hit', show: (L) => `${L * 5}% crit chance` },
  { id: 'reload', name: 'Quick Hands', emoji: '🔄', branch: 'power', parent: 'damage', needs: 1, costs: LEAF, per: 0.12, text: 'Reload 12% faster', show: (L) => `+${L * 12}% reload speed` },
  { id: 'slots', name: 'Double Holster', emoji: '🎒', branch: 'power', parent: 'damage', needs: 2, costs: [150], per: 1, text: 'Start every tower run with 2 weapons (a random 2nd one from the 📦 crate list)', show: () => '2 weapons at the start' },
  { id: 'fireDmg', name: 'Hot Hot Hot', emoji: '🔥', branch: 'power', parent: 'crit', needs: 1, costs: [30, 60, 100, 160], per: 0.15, text: 'Fire weapons (🐉 Dragon Breath, 🧪 Fire Potion, 🎆 Firework Launcher) do 15% more damage', show: (L) => `+${L * 15}% fire damage` },
  { id: 'spellCd', name: 'Spell Master', emoji: '⏳', branch: 'power', parent: 'slots', needs: 1, costs: [30, 60, 100, 160], per: 0.1, text: 'Spells like the 😡 Angry Spell recharge 10% faster', show: (L) => `+${L * 10}% faster recharge` },
  { id: 'mag', name: 'Big Pockets', emoji: '🔋', branch: 'power', parent: 'reload', needs: 1, costs: [30, 60, 100], per: 0.15, text: '+15% more shots before you need to reload', show: (L) => `+${L * 15}% ammo` },
  // 🍀 Fortune
  { id: 'loot', name: 'Loot Luck', emoji: '🍀', branch: 'fortune', parent: null, costs: ROOT, per: 0.1, text: '+10% more tower rewards in your 🎒 bag', show: (L) => `+${L * 10}% rewards` },
  { id: 'souls', name: 'Treat Magnet', emoji: '🍬', branch: 'fortune', parent: 'loot', needs: 1, costs: LEAF, per: 0.15, text: '+15% 🌽 Candy Corn and 💀 Souls from the tower', show: (L) => `+${L * 15}% candy & souls` },
  { id: 'crateLuck', name: 'Crate Finder', emoji: '📦', branch: 'fortune', parent: 'souls', needs: 1, costs: FINDER, per: 0.01, text: '+1% chance a beaten zombie drops a 📦 Weapon Crate (normal chance is 5%)', show: (L) => `${5 + L}% crate drops` },
  { id: 'speed', name: 'Swift Boots', emoji: '👟', branch: 'fortune', parent: 'loot', needs: 1, costs: LEAF, per: 0.05, text: 'Run 5% faster in fights (tower and boss hall)', show: (L) => `+${L * 5}% fight speed` },
];
