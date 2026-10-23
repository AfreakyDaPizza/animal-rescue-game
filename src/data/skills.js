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

export const SKILL_BRANCHES = {
  survival: { name: 'Survival', emoji: '❤️', color: '#ff5c8a' },
  power: { name: 'Power', emoji: '💥', color: '#ffab40' },
  fortune: { name: 'Fortune', emoji: '🍀', color: '#69f0ae' },
};

const ROOT = [10, 25, 50, 90, 150]; // 325 for all 5 levels
const LEAF = [20, 40, 75, 125, 200]; // 460 for all 5 levels

export const SKILLS = [
  // ❤️ Survival
  { id: 'health', name: 'Max Hearts', emoji: '❤️', branch: 'survival', parent: null, costs: ROOT, per: 0.2, text: '+1 ❤️ heart in fights per level', show: (L) => `+${L} ❤️ heart${L === 1 ? '' : 's'}` },
  { id: 'regen', name: 'Heart Regen', emoji: '💗', branch: 'survival', parent: 'health', needs: 1, costs: LEAF, per: 0.2, text: 'Lost hearts come back 20% faster', show: (L) => `+${L * 20}% faster` },
  { id: 'shield', name: 'Starting Shield', emoji: '🛡️', branch: 'survival', parent: 'health', needs: 2, costs: [40, 90, 160], per: 1, text: 'Start every tower run with a 🛡️ shield that blocks 1 hit', show: (L) => `${L} 🛡️ block${L === 1 ? '' : 's'}` },
  // 💥 Power
  { id: 'damage', name: 'Spell Power', emoji: '💥', branch: 'power', parent: null, costs: ROOT, per: 0.1, text: 'Your magic weapons do 10% more damage', show: (L) => `+${L * 10}% damage` },
  { id: 'crit', name: 'Lucky Crit', emoji: '🎯', branch: 'power', parent: 'damage', needs: 1, costs: LEAF, per: 0.05, text: '5% chance for a ×1.5 CRIT hit', show: (L) => `${L * 5}% crit chance` },
  { id: 'reload', name: 'Quick Hands', emoji: '🔄', branch: 'power', parent: 'damage', needs: 1, costs: LEAF, per: 0.12, text: 'Reload 12% faster', show: (L) => `+${L * 12}% reload speed` },
  // 🍀 Fortune
  { id: 'loot', name: 'Loot Luck', emoji: '🍀', branch: 'fortune', parent: null, costs: ROOT, per: 0.1, text: '+10% more tower rewards in your 🎒 bag', show: (L) => `+${L * 10}% rewards` },
  { id: 'souls', name: 'Treat Magnet', emoji: '🍬', branch: 'fortune', parent: 'loot', needs: 1, costs: LEAF, per: 0.15, text: '+15% 🌽 Candy Corn and 💀 Souls from the tower', show: (L) => `+${L * 15}% candy & souls` },
  { id: 'speed', name: 'Swift Boots', emoji: '👟', branch: 'fortune', parent: 'loot', needs: 1, costs: LEAF, per: 0.05, text: 'Run 5% faster in fights (tower and boss hall)', show: (L) => `+${L * 5}% fight speed` },
];
