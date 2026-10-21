// 50 隻瀕危動物（原稿 30 隻 + 小朋友加嘅每區 2 隻 + Biome 6 嘅 10 隻）（原稿：docs/design-prompt.md）
// biome：0 = Biome 1 … 4 = Biome 5
// status：IUCN 紅色名錄保育狀況（2026 年資料，有啲物種係「整體唔算瀕危，但部分族群好危險」）
import { petMoney, FIRE_MONEY, ECLIPSE_MONEY, SPECTRAL_MONEY, PHANTOM_MONEY } from './balance.js';
import { HALLOWEEN_PETS } from './halloween.js'; // 🎃 Halloween 蛋寵物（唔喺 ANIMALS：唔會喺普通生態區出）
export { HALLOWEEN_PETS };
import { CHEST_PETS } from './echoChest.js'; // 🐕 Echo 嘅 Zombified Chest 寵物（淨係箱度開到）
export { CHEST_PETS };
import { METEOR_PETS, ARCADRAGON_MONEY } from './meteorShop.js'; // ☄️ Meteoric Shop 寵物（Issue #10：淨係 Meteoric Chest／直接買）
export { METEOR_PETS };

// emoji：快捷欄同圖鑑用嘅小圖示（3D 模型喺 src/animalModels.js）
// kg：成年動物大約幾重 [最輕, 最重]；每隻救返嚟嘅動物會隨機有一個重量，越重賺越多錢

export const ANIMALS = [
  // ---- Biome 1：Deforestation Site ----
  { name: 'Giant Panda', biome: 0, emoji: '🐼', kg: [70, 125], status: 'Vulnerable',
    fact: 'Giant pandas spend 10 to 16 hours a day eating bamboo.' },
  { name: 'African Savanna Elephant', biome: 0, emoji: '🐘', kg: [3000, 6000], status: 'Endangered',
    fact: 'The largest land animal on Earth. Its big ears help it keep cool.' },
  { name: 'African Forest Elephant', biome: 0, emoji: '🐘', kg: [1700, 4000], status: 'Critically Endangered',
    fact: 'Forest elephants are "gardeners": they spread seeds that grow into new trees.' },
  { name: 'Black Rhinoceros', biome: 0, emoji: '🦏', kg: [800, 1400], status: 'Critically Endangered',
    fact: 'Its pointed, hook-shaped upper lip grabs leaves and twigs like a finger.' },

  { name: 'Red Panda', biome: 0, emoji: '🦝', kg: [3, 6.2], status: 'Endangered',
    fact: 'Red pandas wrap their big fluffy tail around themselves like a blanket to keep warm.' },
  { name: 'Okapi', biome: 0, emoji: '🦓', kg: [200, 350], status: 'Endangered',
    fact: 'Okapis have zebra stripes but are related to giraffes. Their tongue is long enough to lick their own ears!' },

  // ---- Biome 2：Polluted Ocean ----
  { name: 'Manta Ray', biome: 1, emoji: '🐟', kg: [700, 2000], status: 'Endangered',
    fact: 'Manta rays have one of the biggest brains of any fish.' },
  { name: 'Scalloped Hammerhead Shark', biome: 1, emoji: '🦈', kg: [30, 150], status: 'Critically Endangered',
    fact: 'Its wide, hammer-shaped head helps it find prey hiding in the sand.' },
  { name: 'Blue Whale', biome: 1, emoji: '🐋', kg: [100000, 190000], status: 'Endangered',
    fact: 'The largest animal that has ever lived - even bigger than dinosaurs.' },
  { name: 'Vaquita', biome: 1, emoji: '🐬', kg: [30, 55], status: 'Critically Endangered',
    fact: 'The rarest sea mammal in the world. Only about 10 are left.' },
  { name: 'Sea Turtle', biome: 1, emoji: '🐢', kg: [70, 200], status: 'Threatened (most species)',
    fact: 'Sea turtles can mistake floating plastic bags for jellyfish.' },

  { name: 'Whale Shark', biome: 1, emoji: '🦈', kg: [9000, 20000], status: 'Endangered',
    fact: 'The biggest fish in the world - but it only eats tiny plankton and is gentle to divers.' },
  { name: 'Dugong', biome: 1, emoji: '🧜', kg: [250, 400], status: 'Vulnerable',
    fact: 'Dugongs are "sea cows" that munch seagrass all day. Sailors long ago may have thought they were mermaids!' },

  // ---- Biome 3：Bird Poaching Site ----
  { name: "Spix's Macaw", biome: 2, emoji: '🦜', kg: [0.25, 0.4], status: 'Extinct in the Wild (being returned)',
    fact: 'The blue parrot from the movie Rio. Scientists are releasing them back into Brazil.' },
  { name: 'Philippine Eagle', biome: 2, emoji: '🦅', kg: [4.5, 8], status: 'Critically Endangered',
    fact: 'One of the largest eagles in the world and the national bird of the Philippines.' },
  { name: 'Kakapo', biome: 2, emoji: '🦜', kg: [1, 4], status: 'Critically Endangered',
    fact: 'The heaviest parrot in the world - and it cannot fly!' },
  { name: 'Hyacinth Macaw', biome: 2, emoji: '🦜', kg: [1.2, 1.7], status: 'Vulnerable',
    fact: 'The largest flying parrot. Its strong beak can crack hard nuts.' },
  { name: 'Sun Conure', biome: 2, emoji: '🐤', kg: [0.1, 0.13], status: 'Endangered',
    fact: 'A bright yellow and orange parrot from South America.' },

  { name: 'California Condor', biome: 2, emoji: '🦅', kg: [7, 12], status: 'Critically Endangered',
    fact: 'Once only 27 were left in the world! Thanks to rescuers, there are now over 500.' },
  { name: 'Bali Myna', biome: 2, emoji: '🐦', kg: [0.08, 0.12], status: 'Critically Endangered',
    fact: 'A snow-white bird with bright blue skin around its eyes. Poachers caught so many it almost vanished from the wild.' },

  // ---- Biome 4：Arctic Meltdown ----
  { name: 'Polar Bear', biome: 3, emoji: '🐻', kg: [150, 700], status: 'Vulnerable',
    fact: 'Its fur looks white, but its skin underneath is black.' },
  { name: 'Narwhal', biome: 3, emoji: '🐋', kg: [800, 1600], status: 'Least Concern (threatened by melting ice)',
    fact: 'Its long "tusk" is actually a tooth that can grow up to 3 metres.' },
  { name: 'Beluga Whale', biome: 3, emoji: '🐳', kg: [700, 1600], status: 'Least Concern (some groups Critically Endangered)',
    fact: 'Called the "canary of the sea" because it chirps and whistles.' },
  { name: 'Ringed Seal', biome: 3, emoji: '🦭', kg: [50, 70], status: 'Least Concern (threatened by melting ice)',
    fact: 'Mother seals dig snow caves on the ice to keep their pups safe.' },
  { name: 'Emperor Penguin', biome: 3, emoji: '🐧', kg: [22, 45], status: 'Near Threatened',
    fact: 'The biggest penguin. Dads keep the egg warm on their feet all winter.' },
  { name: 'Arctic Fox', biome: 3, emoji: '🦊', kg: [2.5, 6], status: 'Least Concern (threatened by melting ice)',
    fact: 'Its fur is white in winter and brown in summer.' },
  { name: 'Caribou', biome: 3, emoji: '🦌', kg: [70, 200], status: 'Vulnerable',
    fact: 'Both males and females grow antlers.' },
  { name: 'Snowy Owl', biome: 3, emoji: '🦉', kg: [1.6, 3], status: 'Vulnerable',
    fact: 'Unlike most owls, it hunts during the day in the Arctic summer.' },

  { name: 'Walrus', biome: 3, emoji: '🦭', kg: [600, 1500], status: 'Vulnerable',
    fact: 'Walruses use their long tusks like ice picks to pull themselves out of the water onto the ice.' },
  { name: 'Atlantic Puffin', biome: 3, emoji: '🐦', kg: [0.4, 0.55], status: 'Vulnerable',
    fact: 'Puffins can carry more than 10 small fish in their colourful beak at the same time!' },

  // ---- Biome 5：Smuggler's Compound ----
  { name: 'Amur Leopard', biome: 4, emoji: '🐆', kg: [25, 50], status: 'Critically Endangered',
    fact: 'Its thick fur keeps it warm in the snowy forests of Russia and China.' },
  { name: 'Sumatran Orangutan', biome: 4, emoji: '🦧', kg: [35, 90], status: 'Critically Endangered',
    fact: 'It spends almost its whole life up in the trees.' },
  { name: 'Bornean Orangutan', biome: 4, emoji: '🦧', kg: [35, 100], status: 'Critically Endangered',
    fact: 'It builds a new bed of leaves to sleep in every night.' },
  { name: 'Mountain Gorilla', biome: 4, emoji: '🦍', kg: [70, 220], status: 'Endangered',
    fact: 'Lives in family groups led by a big male called a silverback.' },
  { name: 'Javan Rhino', biome: 4, emoji: '🦏', kg: [900, 2300], status: 'Critically Endangered',
    fact: 'Only one group is left in the world, in one park in Java, Indonesia.' },
  { name: 'Sumatran Rhino', biome: 4, emoji: '🦏', kg: [500, 950], status: 'Critically Endangered',
    fact: 'The smallest rhino, and the only one covered in hair.' },
  { name: 'Saola', biome: 4, emoji: '🐐', kg: [80, 100], status: 'Critically Endangered',
    fact: 'So rare and hard to find that it is called the "Asian unicorn".' },
  { name: 'Pangolin', biome: 4, emoji: '🦔', kg: [2, 10], status: 'Critically Endangered (some species)',
    fact: 'The only mammal covered in scales. It rolls into a ball to stay safe.' },
  { name: 'Sumatran Tiger', biome: 4, emoji: '🐅', kg: [75, 140], status: 'Critically Endangered',
    fact: 'The smallest tiger in the world. Only about 600 or fewer are left in the wild.' },
  { name: 'Slow Loris', biome: 4, emoji: '🐒', kg: [0.6, 2], status: 'Endangered',
    fact: 'The only venomous primate! Sadly, many are smuggled to be sold as pets - so never buy one.' },

  // ---- Biome 6：Mining Mountain（小朋友加嘅新生態區）----
  { name: 'Snow Leopard', biome: 5, emoji: '🐆', kg: [22, 55], status: 'Vulnerable',
    fact: 'Snow leopards wrap their super-long, fluffy tail around their face like a scarf to keep warm.' },
  { name: 'Andean Bear', biome: 5, emoji: '🐻', kg: [60, 175], status: 'Vulnerable',
    fact: 'Also called the spectacled bear - the pale rings around its eyes look like glasses!' },
  { name: 'Ethiopian Wolf', biome: 5, emoji: '🐺', kg: [11, 19], status: 'Endangered',
    fact: "Africa's rarest wolf lives high in the mountains of Ethiopia. Only about 500 are left." },
  { name: 'Mountain Pygmy Possum', biome: 5, emoji: '🐭', kg: [0.03, 0.08], status: 'Critically Endangered',
    fact: 'A tiny possum that sleeps under the snow for up to 7 months every year!' },
  { name: 'Golden Snub-nosed Monkey', biome: 5, emoji: '🐒', kg: [6, 39], status: 'Endangered',
    fact: 'It has golden fur and a tiny turned-up nose. It lives in snowy mountain forests in China.' },
  { name: 'Takin', biome: 5, emoji: '🐂', kg: [250, 350], status: 'Vulnerable',
    fact: 'A big shaggy goat-antelope. Some people think its golden coat inspired the legend of the Golden Fleece!' },
  { name: 'Pyrenean Desman', biome: 5, emoji: '🐀', kg: [0.05, 0.08], status: 'Endangered',
    fact: 'A tiny swimming mammal with a long bendy nose like a mini trunk. It needs clean mountain streams.' },
  { name: 'Himalayan Musk Deer', biome: 5, emoji: '🦌', kg: [11, 18], status: 'Endangered',
    fact: 'It has no antlers - instead, the males have long teeth that look like vampire fangs!' },
  { name: 'Andean Cat', biome: 5, emoji: '🐈', kg: [3.5, 5], status: 'Endangered',
    fact: 'One of the rarest wild cats in the world. It lives high in the Andes mountains and has a super-thick tail.' },
  { name: 'Volcano Rabbit', biome: 5, emoji: '🐇', kg: [0.4, 0.6], status: 'Endangered',
    fact: 'A tiny rabbit with round ears that lives only on the slopes of volcanoes near Mexico City!' },
];

// ---- Fuse Machine 先有嘅寵物（小朋友 2026-10-17 Issue #4）----
// 唔會喺生態區出現、唔計入 Index 嘅 50 隻；每隻固定一個稀有度
// ---- Biome 7：Enchanted Kingdom（小朋友 2026-10-17）：魔法動物（唔係真嘅！）其他動物小朋友遲啲講 ----
// rarity：呢啲動物嘅稀有度係固定嘅（小朋友 Issue #5 定），唔係隨機
export const ENCHANTED_ANIMALS = [
  { name: 'Royal Skywhale', biome: 6, emoji: '🐋', kg: [20000, 40000], rarity: 'Eternal', status: 'Magical (not a real animal!)', magical: true,
    fact: 'The Royal Skywhale is a magical creature from the Enchanted Kingdom. It is not real, but real Blue Whales are Endangered: only about 10,000-25,000 are left!' },
  { name: 'Celestial Sunlion', biome: 6, emoji: '🦁', kg: [450, 700], rarity: 'Mythic', status: 'Magical (not a real animal!)', magical: true,
    fact: 'Magical! But real lions are Vulnerable: about 23,000 are left in the wild, and they have lost over 90% of the land they used to live on.' },
  { name: 'Octophant', biome: 6, emoji: '🐘', kg: [3000, 5500], rarity: 'Legendary', status: 'Magical (not a real animal!)', magical: true,
    fact: 'Half elephant, half octopus, all magic! Real octopuses have three hearts and blue blood.' },
  { name: 'Citadel Snail', biome: 6, emoji: '🐌', kg: [40, 90], rarity: 'Epic', status: 'Magical (not a real animal!)', magical: true,
    fact: 'It carries a whole castle on its back! Real snails are important: many island snail species are Critically Endangered.' },
  { name: 'Uncoiled Armadillo', biome: 6, emoji: '🦔', kg: [60, 120], rarity: 'Epic', status: 'Magical (not a real animal!)', magical: true,
    fact: 'Its lantern tower lights the way! The real Giant Armadillo is Vulnerable and digs burrows that help many other animals.' },
  { name: 'Kitsune Of Runes', biome: 6, emoji: '🦊', kg: [8, 15], rarity: 'Rare', status: 'Magical (not a real animal!)', magical: true,
    fact: 'A kitsune is a magical fox from Japanese stories. Real Island Foxes were saved from extinction by people working together!' },
  { name: 'Gem Dragon', biome: 6, emoji: '🐉', kg: [200, 400], rarity: 'Rare', status: 'Magical (not a real animal!)', magical: true,
    fact: 'Dragons are magical, but the real Komodo Dragon is Endangered: rising seas are taking its island home.' },
  { name: 'Dreadscale', biome: 6, emoji: '🦖', kg: [150, 300], rarity: 'Common', status: 'Magical (not a real animal!)', magical: true,
    fact: 'Spiky but friendly! Real pangolins have scales too, and they are the most trafficked mammals in the world.' },
];
ANIMALS.push(...ENCHANTED_ANIMALS);

export const FUSE_PETS = [
  { name: 'Rhinoblade', rarity: 'Common', emoji: '🦏', kg: [900, 1500], fuse: true, biome: 5, status: 'Fuse-only',
    fact: 'A rhino with steel blade horns, made in the Fuse Machine!' },
  { name: 'Spideron', rarity: 'Rare', emoji: '🕷️', kg: [40, 90], fuse: true, biome: 5, status: 'Fuse-only',
    fact: 'A giant glowing spider with eight legs and six eyes!' },
  { name: 'Dunkleosteus', rarity: 'Epic', emoji: '🐟', kg: [1000, 3500], fuse: true, biome: 5, status: 'Fuse-only',
    fact: 'Based on a real armoured fish that lived 360 million years ago. Its jaws were sharp bony blades!' },
  { name: 'Puffaball', rarity: 'Legendary', emoji: '🐡', kg: [5, 15], fuse: true, biome: 5, status: 'Fuse-only',
    fact: 'A round puffer-fish ball that floats in the air and puffs up when it is happy!' },
  { name: 'Endangered Combination', rarity: 'Mythic', emoji: '🌟', kg: [500, 2000], fuse: true, biome: 5, status: 'Fuse-only',
    fact: 'Panda head, elephant trunk, eagle wings, turtle shell and tiger stripes - all endangered animals in one!' },
];

export const animalsInBiome = (biome) => (biome >= 7 ? HALLOWEEN_PETS : ANIMALS).filter((a) => a.biome === biome); // 7–9 = 🎃 Halloween

// 舊名（2026-10-17 小朋友改名）
const OLD_NAMES = { 'Enchanted Sunlion': 'Celestial Sunlion' };
export const findAnimal = (name) => (OLD_NAMES[name] ? findAnimal(OLD_NAMES[name]) : null) || ANIMALS.find((a) => a.name === name) || FUSE_PETS.find((a) => a.name === name) || HALLOWEEN_PETS.find((a) => a.name === name) || CHEST_PETS.find((a) => a.name === name) || METEOR_PETS.find((a) => a.name === name);

// 隨機重量（喺真實範圍入面），小過 10 kg 留一個小數位
export function randomKg(animal) {
  const [lo, hi] = animal.kg;
  const kg = lo + Math.random() * (hi - lo);
  return kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg);
}

// 舊存檔冇重量：用中間值
export function kgOf(item) {
  if (item.kg) return item.kg;
  const [lo, hi] = findAnimal(item.name).kg;
  return (lo + hi) / 2;
}

export const formatKg = (kg) => `${kg.toLocaleString('en-US')} kg`;

// ---- 變異（可以疊：🔥 Fire + 🌑 Eclipse，小朋友 2026-10-18）----
// 存法：item.mutation 係字串，'fire'、'eclipse' 或者 'fire+eclipse'（舊存檔照用得）
// 🎃 Halloween（Halloween Shard）：👻 Spectral ×4、🟣 Phantom ×5
export const MUTATIONS = ['fire', 'eclipse', 'spectral', 'phantom'];
const MUTATION_INFO = {
  fire: { emoji: '🔥', name: 'FIRE', color: '#ff6d00', money: FIRE_MONEY },
  eclipse: { emoji: '🌑', name: 'ECLIPSE', color: '#ea80fc', money: ECLIPSE_MONEY },
  spectral: { emoji: '👻', name: 'SPECTRAL', color: '#84ffff', money: SPECTRAL_MONEY },
  phantom: { emoji: '🟣', name: 'PHANTOM', color: '#b388ff', money: PHANTOM_MONEY },
};
export const mutationInfo = (m) => MUTATION_INFO[m];
export const mutationList = (x) => {
  const m = typeof x === 'string' ? x : x?.mutation;
  return m ? m.split('+').filter((k) => MUTATION_INFO[k]) : [];
};
export const hasMutation = (x, m) => mutationList(x).includes(m);
export const joinMutations = (list) => MUTATIONS.filter((m) => list.includes(m)).join('+') || null; // 固定次序：fire+eclipse
export const addMutation = (x, m) => joinMutations([...mutationList(x), m]);
export const mutationMoneyMulti = (x) => mutationList(x).reduce((k, m) => k * (MUTATION_INFO[m].money || 1), 1);
export const mutationEmoji = (x) => mutationList(x).map((m) => MUTATION_INFO[m].emoji).join('');
export const mutationText = (x) => mutationList(x).map((m) => `${MUTATION_INFO[m].emoji} ${MUTATION_INFO[m].name}`).join(' ');

// ---- 大細（sizeMul：0.25–10；冇 = 1）----
export const sizeText = (sizeMul) => (!sizeMul || sizeMul === 1 ? '' : sizeMul < 1 ? `TINY x${sizeMul}` : `GIANT x${sizeMul}`);

// 一隻救返嚟嘅動物／寵物每秒賺幾多（重量 × 生態區 × 稀有度）
export const itemMoney = (item) => (item.money ?? fixedMoney(item) ?? petMoney(kgOf(item), item.biome, item.rarity)) * mutationMoneyMulti(item);
// 🌌 Cosmic Arcadragon（Issue #10）：每隻自己有一個隨機 $/秒（5 億–10 億），第一次計就抽、存喺 item.money（之後唔變）
// 咁樣邊度整出嚟都啱（商店買、控制面板、繁殖機生出嚟）
function fixedMoney(item) {
  if (item.name !== 'Cosmic Arcadragon') return undefined;
  const [lo, hi] = ARCADRAGON_MONEY;
  item.money = Math.round((lo + Math.random() * (hi - lo)) / 1e6) * 1e6;
  return item.money;
} // Fuse 寵物有自己定好嘅 money；🔥 Fire ×4、🌑 Eclipse ×6（可以疊）

// 越重越大隻：同一種動物，最輕嗰隻 ×0.8，最重嗰隻 ×1.25（小朋友：大細要跟重量）
export function kgScale(item) {
  const [lo, hi] = findAnimal(item.name).kg;
  const t = hi > lo ? Math.min(1, Math.max(0, (kgOf(item) - lo) / (hi - lo))) : 0.5;
  return 0.8 + t * 0.45;
}
