// 🤠 Catch & Tame 嘅動物（小朋友 Issue #16）：3 張地圖每張 10 隻，名同 data/tame.js 嘅 RODEO_MAPS 一樣
// 唔放入 ANIMALS（唔會喺普通生態區出、唔計入 Index 嘅 50 隻），findAnimal 搵得到（animals.js）
// status：IUCN 紅色名錄（2026 年資料；Dromedary 冇野生族群，IUCN 冇評）
// rarity：每種動物固定一個稀有度（越稀有越少見、越難馴服、俾多啲 🤠 Tame Tokens）
// speed：佢自己跑幾快（1 = 同你匹馬差唔多）；h：Catch & Tame 入面幾高（米，細隻嘅會放大少少，騎得到）
//
// The kid can change the numbers below (English comments).

// 💰 Tamed pets earn money like pets from this biome (5 = Mining Mountain, base $6,000/sec).
// Fair, not overpowered: Halloween pets earn much more.
export const TAME_PET_BIOME = 5;

// 🤠 Tame Tokens for each rarity (× RODEO_TOKENS_PER_TAME in data/tame.js)
export const TAME_TOKEN_BONUS = { Common: 1, Rare: 2, Epic: 3, Legendary: 5, Mythic: 8 };
// 🎵 Seconds to fill the tame bar with a level 1 flute (rarer = longer). The flute makes it faster.
export const TAME_SECONDS = { Common: 4, Rare: 5.5, Epic: 7, Legendary: 9, Mythic: 11 };
// 🐂 How hard a wild animal bucks while you tame it (0 = calm, 1 = crazy)
export const TAME_BUCK = { Common: 0.35, Rare: 0.5, Epic: 0.65, Legendary: 0.8, Mythic: 1 };
// 🎲 How often each rarity shows up in a herd (bigger = more often). Rarer ones get a bit more common the further you ride.
export const TAME_SPAWN_WEIGHT = { Common: 40, Rare: 22, Epic: 11, Legendary: 4.5, Mythic: 1.5 };

// 🏇 Run settings
export const RODEO_START_SPEED = 15; // metres per second at the start
export const RODEO_MAX_SPEED = 27; // fastest it gets
export const RODEO_SPEED_UP = 0.006; // +this much speed for every metre you ride
export const RODEO_LANE = 15; // how far left/right you can ride (metres from the middle)
export const RODEO_HIT_SAFE = 1.6; // seconds you can't be hit again after a crash
export const RODEO_MAX_ANIMALS = 13; // animals running around you at once (more = slower computers lag)

const T = (o) => ({ ...o, biome: TAME_PET_BIOME, where: 'Catch & Tame', tame: true });

export const TAME_ANIMALS = [
  // ---- 🦒 Savanna ----
  T({ name: 'Zebra', map: 'savanna', emoji: '🦓', rarity: 'Common', kg: [175, 385], speed: 1.0, h: 1.9, status: 'Near Threatened',
    fact: 'Every zebra has its own stripe pattern, like a fingerprint! The stripes may help keep biting flies away.' }),
  T({ name: 'Wildebeest', map: 'savanna', emoji: '🐃', rarity: 'Common', kg: [150, 290], speed: 0.95, h: 1.9, status: 'Least Concern',
    fact: 'Over a million wildebeest walk in a giant circle across Tanzania and Kenya every year: the Great Migration!' }),
  T({ name: 'Warthog', map: 'savanna', emoji: '🐗', rarity: 'Common', kg: [50, 150], speed: 0.85, h: 1.2, status: 'Least Concern',
    fact: 'Warthogs kneel down on their front knees to eat short grass. When they run, their tail sticks straight up like a flag!' }),
  T({ name: 'Ostrich', map: 'savanna', emoji: '🪶', rarity: 'Rare', kg: [63, 145], speed: 1.1, h: 2.5, status: 'Least Concern',
    fact: 'The biggest bird in the world. It cannot fly, but it can run 70 km/h and lays the biggest eggs of any living bird.' }),
  T({ name: 'Giraffe', map: 'savanna', emoji: '🦒', rarity: 'Rare', kg: [800, 1930], speed: 0.9, h: 5, seat: 0.5, status: 'Vulnerable',
    fact: 'The tallest animal on Earth! Its blue-black tongue is about 50 cm long. Giraffe numbers fell by about 40% in 30 years.' }),
  T({ name: 'Hippo', map: 'savanna', emoji: '🦛', rarity: 'Epic', kg: [1300, 3200], speed: 0.8, h: 1.8, status: 'Vulnerable',
    fact: 'Hippos make their own red-coloured "sunscreen" from their skin. They spend most of the hot day in rivers and lakes.' }),
  T({ name: 'Rhino', map: 'savanna', emoji: '🦏', rarity: 'Epic', kg: [1800, 2500], speed: 0.85, h: 1.9, status: 'Near Threatened',
    fact: 'The southern white rhino was almost gone 100 years ago (fewer than 100 left). Rangers saved it, but poachers still hunt rhinos for their horns.' }),
  T({ name: 'Lion', map: 'savanna', emoji: '🦁', rarity: 'Legendary', kg: [120, 250], speed: 1.05, h: 1.6, status: 'Vulnerable',
    fact: 'A lion\'s roar can be heard 8 km away! Lions have lost over 90% of the land they used to live on.' }),
  T({ name: 'African Elephant', map: 'savanna', emoji: '🐘', rarity: 'Legendary', kg: [3000, 6000], speed: 0.8, h: 3.4, status: 'Endangered',
    fact: 'Elephants can "hear" with their feet: they feel rumbles from other elephants through the ground, kilometres away.' }),
  T({ name: 'Cheetah', map: 'savanna', emoji: '🐆', rarity: 'Mythic', kg: [21, 72], speed: 1.3, h: 1.4, status: 'Vulnerable',
    fact: 'The fastest land animal: about 110 km/h! Only around 7,000 adult cheetahs are left in the wild.' }),

  // ---- 🐪 Desert ----
  T({ name: 'Meerkat', map: 'desert', emoji: '🦦', rarity: 'Common', kg: [0.6, 1], speed: 0.9, h: 1.0, status: 'Least Concern',
    fact: 'Meerkats take turns standing guard on a lookout. If they see an eagle, they whistle and everyone dives into the burrow!' }),
  T({ name: 'Roadrunner', map: 'desert', emoji: '🐦', rarity: 'Common', kg: [0.2, 0.5], speed: 1.1, h: 1.1, status: 'Least Concern',
    fact: 'Roadrunners would rather run than fly. They zoom along at about 30 km/h and can even catch rattlesnakes!' }),
  T({ name: 'Dromedary', map: 'desert', emoji: '🐪', rarity: 'Common', kg: [400, 600], speed: 0.9, h: 2.3, seat: 0.82, status: 'Domesticated (no wild ones left)',
    fact: 'Its one hump is full of fat, not water! A thirsty dromedary can drink about 100 litres of water in 10 minutes.' }),
  T({ name: 'Fennec Fox', map: 'desert', emoji: '🦊', rarity: 'Rare', kg: [0.7, 1.6], speed: 1.05, h: 1.0, status: 'Least Concern',
    fact: 'The smallest fox in the world, with the biggest ears for its size. The ears let out heat and hear bugs under the sand.' }),
  T({ name: 'Sand Cat', map: 'desert', emoji: '🐈', rarity: 'Rare', kg: [1.4, 3.4], speed: 1.0, h: 1.0, status: 'Least Concern',
    fact: 'Sand cats have thick fur on the bottom of their paws, like snow boots, so the hot sand does not burn them.' }),
  T({ name: 'Desert Tortoise', map: 'desert', emoji: '🐢', rarity: 'Epic', kg: [4, 7], speed: 0.6, h: 1.0, status: 'Critically Endangered',
    fact: 'It spends about 95% of its life in underground burrows to hide from the heat. It can live for over 50 years.' }),
  T({ name: 'Gila Monster', map: 'desert', emoji: '🦎', rarity: 'Epic', kg: [0.4, 2.3], speed: 0.7, h: 0.9, status: 'Near Threatened',
    fact: 'One of the very few venomous lizards. A medicine for diabetes was made from something found in its spit!' }),
  T({ name: 'Arabian Oryx', map: 'desert', emoji: '🦌', rarity: 'Legendary', kg: [70, 90], speed: 1.05, h: 1.7, status: 'Vulnerable',
    fact: 'It was gone from the wild in 1972, but zoos bred it and set it free again. The first animal ever to go from "Extinct in the Wild" back to "Vulnerable"!' }),
  T({ name: 'Camel', map: 'desert', emoji: '🐫', rarity: 'Legendary', kg: [300, 1000], speed: 0.9, h: 2.3, seat: 0.82, status: 'Critically Endangered',
    fact: 'The wild Bactrian camel has two humps and can drink salty water. Fewer than 1,000 are left in the Gobi Desert.' }),
  T({ name: 'Addax', map: 'desert', emoji: '🐐', rarity: 'Mythic', kg: [60, 125], speed: 0.95, h: 1.6, status: 'Critically Endangered',
    fact: 'A white desert antelope with twisty horns. It almost never needs to drink. Fewer than 100 are left in the wild.' }),

  // ---- 🌲 Taiga ----
  T({ name: 'Snowshoe Hare', map: 'taiga', emoji: '🐇', rarity: 'Common', kg: [1.2, 1.6], speed: 1.1, h: 1.0, status: 'Least Concern',
    fact: 'Its fur turns white in winter and brown in summer, and its giant furry feet work like snowshoes!' }),
  T({ name: 'Red Fox', map: 'taiga', emoji: '🦊', rarity: 'Common', kg: [3, 10], speed: 1.05, h: 1.0, status: 'Least Concern',
    fact: 'Red foxes can hear a mouse squeak under the snow, then jump high and dive in nose-first to catch it.' }),
  T({ name: 'Reindeer', map: 'taiga', emoji: '🦌', rarity: 'Common', kg: [80, 180], speed: 1.0, h: 2.0, status: 'Vulnerable',
    fact: 'The only deer where boys AND girls grow antlers. Their eyes turn blue in winter to see better in the dark!' }),
  T({ name: 'Grey Wolf', map: 'taiga', emoji: '🐺', rarity: 'Rare', kg: [30, 80], speed: 1.1, h: 1.3, status: 'Least Concern',
    fact: 'Wolves live in family packs. A wolf howl can be heard up to 10 km away in the forest.' }),
  T({ name: 'Lynx', map: 'taiga', emoji: '🐈', rarity: 'Rare', kg: [18, 30], speed: 1.05, h: 1.2, status: 'Least Concern',
    fact: 'Lynx have black tufts on their ears and huge furry paws that help them walk on top of deep snow.' }),
  T({ name: 'Moose', map: 'taiga', emoji: '🫎', rarity: 'Epic', kg: [380, 700], speed: 0.9, h: 2.6, status: 'Least Concern',
    fact: 'The biggest deer in the world. Moose are great swimmers and can dive about 6 metres down to eat water plants!' }),
  T({ name: 'Wolverine', map: 'taiga', emoji: '🦡', rarity: 'Epic', kg: [9, 25], speed: 1.0, h: 1.1, status: 'Least Concern',
    fact: 'Small but super tough! A wolverine can climb steep snowy mountains and smell food buried 6 metres under the snow.' }),
  T({ name: 'Brown Bear', map: 'taiga', emoji: '🐻', rarity: 'Legendary', kg: [100, 600], speed: 0.9, h: 2.0, status: 'Least Concern',
    fact: 'Brown bears eat lots in autumn, then sleep through the winter in a den. Mother bears have their cubs while they sleep!' }),
  T({ name: 'Bison', map: 'taiga', emoji: '🦬', rarity: 'Legendary', kg: [400, 920], speed: 0.85, h: 2.2, status: 'Near Threatened',
    fact: 'Wild European bison died out in 1927. Every one alive today comes from just 12 bison in zoos - now they roam the forests again!' }),
  T({ name: 'Siberian Tiger', map: 'taiga', emoji: '🐅', rarity: 'Mythic', kg: [180, 300], speed: 1.15, h: 1.7, status: 'Endangered',
    fact: 'The biggest cat in the world, with thick fur for the snowy forests of Russia. Only a few hundred live in the wild.' }),
];

export const tameAnimal = (name) => TAME_ANIMALS.find((a) => a.name === name);
export const tameAnimalsOn = (mapId) => TAME_ANIMALS.filter((a) => a.map === mapId);
