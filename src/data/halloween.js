// 🎃 Halloween 寵物（小朋友 2026-10-19 Issue #6）：由蛋孵出嚟，唔係真動物，唔會喺普通生態區出現
// biome：7 = 🎃 Pumpkin Graveyard、8 = 👻 Hollow Sprites、9 = 🏚️ Abandoned Manor（數字俾錢／時間表用；hw 係 Halloween 世界嘅生態區）
// hatchSeconds：蛋要孵幾耐（小朋友定）；rarity 固定

const SPOOKY = 'Halloween pet (not a real animal!)';

export const HALLOWEEN_BIOMES = [
  { key: 'hw1', biome: 7, name: 'Pumpkin Graveyard', emoji: '🎃' },
  { key: 'hw2', biome: 8, name: 'Hollow Sprites', emoji: '👻' },
  { key: 'hw3', biome: 9, name: 'Abandoned Manor', emoji: '🏚️' },
];

export const HALLOWEEN_PETS = [
  // ---- 🎃 Pumpkin Graveyard ----
  { name: 'Whiskers', hw: 'hw1', biome: 7, rarity: 'Common', hatchSeconds: 20, kg: [3, 6], emoji: '🐈‍⬛',
    fact: 'A little black cat with a pumpkin collar. It purrs louder when the moon is full!' },
  { name: 'Jesterpop', hw: 'hw1', biome: 7, rarity: 'Rare', hatchSeconds: 90, kg: [8, 15], emoji: '🤡',
    fact: 'A bouncy jester whose hat bells jingle a spooky tune. It loves telling jokes to ghosts.' },
  { name: 'Candlefang', hw: 'hw1', biome: 7, rarity: 'Epic', hatchSeconds: 180, kg: [20, 40], emoji: '🕯️',
    fact: 'A friendly bat-wolf with a candle on its head. The flame never goes out, even in the rain!' },
  { name: 'Spirit Knight', hw: 'hw1', biome: 7, rarity: 'Epic', hatchSeconds: 300, kg: [60, 110], emoji: '🛡️',
    fact: 'An empty suit of armour filled with a brave, glowing spirit. It guards the graveyard at night.' },
  { name: 'Graveyard Brute', hw: 'hw1', biome: 7, rarity: 'Legendary', hatchSeconds: 900, kg: [300, 600], emoji: '🪦',
    fact: 'A huge stone giant made of old tombstones. Scary looking, but it is a gentle softie.' },
  { name: 'Ghost Reaper', hw: 'hw1', biome: 7, rarity: 'Mythic', hatchSeconds: 1800, kg: [50, 90], emoji: '👻',
    fact: 'A floating hooded spirit with a glowing scythe. It helps lost souls find their way home.' },
  // ---- 👻 Hollow Sprites ----
  { name: 'Hooded Gerbil', hw: 'hw2', biome: 8, rarity: 'Common', hatchSeconds: 60, kg: [0.1, 0.3], emoji: '🐹',
    fact: 'A tiny gerbil in a purple cloak. It hides acorns and candy in its hood!' },
  { name: 'Toadstool', hw: 'hw2', biome: 8, rarity: 'Rare', hatchSeconds: 120, kg: [2, 5], emoji: '🍄',
    fact: 'A toad with a glowing mushroom cap. Its spots light up when it is happy.' },
  { name: 'Patchwork Imp', hw: 'hw2', biome: 8, rarity: 'Epic', hatchSeconds: 450, kg: [10, 25], emoji: '🧵',
    fact: 'A cheeky little imp stitched together from old blankets. It giggles when you hug it.' },
  { name: 'Haunted Scorpio', hw: 'hw2', biome: 8, rarity: 'Legendary', hatchSeconds: 780, kg: [80, 160], emoji: '🦂',
    fact: 'A ghostly scorpion with a glowing green tail. It can walk straight through walls!' },
  { name: 'BloodBloom', hw: 'hw2', biome: 8, rarity: 'Mythic', hatchSeconds: 1950, kg: [150, 300], emoji: '🌹',
    fact: 'A giant walking rose with thorny vines and a glowing heart. It smells like strawberry jam!' },
  // ---- 🏚️ Abandoned Manor ----
  { name: 'Mimic Chest', hw: 'hw3', biome: 9, rarity: 'Rare', hatchSeconds: 600, kg: [30, 70], emoji: '🧰',
    fact: 'Looks like a treasure chest... but it has a tongue! It only snaps at bad guys.' },
  { name: 'Crowshade', hw: 'hw3', biome: 9, rarity: 'Epic', hatchSeconds: 1200, kg: [1, 3], emoji: '🐦‍⬛',
    fact: 'A shadow crow with purple-glowing eyes. It collects shiny buttons from the old manor.' },
  { name: 'Hexed Pumpkin', hw: 'hw3', biome: 9, rarity: 'Legendary', hatchSeconds: 1500, kg: [100, 250], emoji: '🎃',
    fact: 'A magic pumpkin with a witch hat and spooky green fire. It can float when it laughs.' },
  { name: 'Werewolf', hw: 'hw3', biome: 9, rarity: 'Legendary', hatchSeconds: 1800, kg: [90, 160], emoji: '🐺',
    fact: 'A big fluffy wolf that howls at the moon. Real grey wolves help keep forests healthy!' },
  { name: 'Abomination Kong', hw: 'hw3', biome: 9, rarity: 'Mythic', hatchSeconds: 2400, kg: [800, 1600], emoji: '🦍',
    fact: 'A giant patched-up gorilla with glowing purple stitches. Its roar shakes the whole manor!' },
  { name: 'Voidseer Pumpkin', hw: 'hw3', biome: 9, rarity: 'Eternal', hatchSeconds: 3300, kg: [500, 1200], emoji: '🔮',
    fact: 'The rarest Halloween pet. A cosmic pumpkin with one all-seeing eye full of stars.' },
].map((p) => ({ ...p, status: SPOOKY, magical: true, halloween: true }));

// 抽蛋時每個稀有度嘅比重（越稀有越少出）
export const HALLOWEEN_EGG_WEIGHT = { Common: 40, Rare: 25, Epic: 15, Legendary: 7, Mythic: 2.5, Eternal: 0.5 };

export const halloweenPetsIn = (hw) => HALLOWEEN_PETS.filter((p) => p.hw === hw);

// 抽一隻（rand 0–1）：hw = 邊個 Halloween 生態區
export function rollHalloweenEgg(hw, rand = Math.random()) {
  const pool = halloweenPetsIn(hw);
  const total = pool.reduce((n, p) => n + HALLOWEEN_EGG_WEIGHT[p.rarity], 0);
  let roll = rand * total;
  return pool.find((p) => (roll -= HALLOWEEN_EGG_WEIGHT[p.rarity]) < 0) || pool[0];
}
