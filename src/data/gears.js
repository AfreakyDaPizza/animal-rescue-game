// ⚙️ Gears（小朋友 Issue #10）：背包「Gears」分頁入面嘅道具
// 存法：state.gears = [{ type: 'halloweenShard' }, { type: 'meteoricShard' }, …]（同一種可以有好多粒，背包會疊埋顯示 ×N）
// 其他檔案加 gear：addGear('zombieChest', 5); save();（寶箱、Shard 都一樣；或者 chests.js 嘅 giveChests 會順手存檔 + 彈提示）
// mutate()：用嗰陣俾寵物邊個變異（null = 呢隻寵物用唔到，例如已經有晒）

import { state } from '../state.js';
import { hasMutation, mutationInfo, MUTATIONS } from './animals.js';
import { SHARD_PHANTOM_CHANCE } from './balance.js';

export const GEARS = {
  // 🔮 Halloween Shard：Statue of Halloween 用 400 Soul Dust 換；揀一隻寵物 → 一定中，50/50 👻 Spectral 或者 🟣 Phantom
  halloweenShard: {
    name: 'Halloween Shard', emoji: '🔮', color: '#b388ff', rarity: 'Epic', art: 'halloween', // art：src/gearArt.js 嘅樣
    desc: () => `Pick a pet: it becomes 👻 SPECTRAL x${mutationInfo('spectral').money} or 🟣 PHANTOM x${mutationInfo('phantom').money}!`,
    where: 'Trade Soul Dust at the 🗿 Statue of Halloween',
    mutate(pet) {
      let kind = Math.random() * 100 < SHARD_PHANTOM_CHANCE ? 'phantom' : 'spectral';
      if (hasMutation(pet, kind)) kind = kind === 'phantom' ? 'spectral' : 'phantom'; // 已經有一樣：畀另一樣
      return hasMutation(pet, kind) ? null : kind;
    },
    canUse: (pet) => !(hasMutation(pet, 'spectral') && hasMutation(pet, 'phantom')),
    portal: true, // 地塊上面嘅寵物：播 Halloween 傳送門動畫（halloweenShards.js）
  },
  // ☄️ Meteoric Shard：Meteoric Shop（另一個幫手整緊）賣；揀一隻寵物 → ☄️ Meteoric
  meteoricShard: {
    name: 'Meteoric Shard', emoji: '☄️', color: '#40c4ff', rarity: 'Legendary', art: 'meteoric', mutation: 'meteoric',
    desc: () => `Pick a pet: it becomes ☄️ METEORIC x${mutationInfo('meteoric').money}!`,
    where: 'Buy it at the ☄️ Meteoric Shop',
    mutate: (pet) => (hasMutation(pet, 'meteoric') ? null : 'meteoric'),
    canUse: (pet) => !hasMutation(pet, 'meteoric'),
  },
  // 🌌 Astral Reroll：Meteoric Chest 1% 開到；揀一隻寵物 → 🌌 Astral（加落去，唔會洗走其他變異）
  astralReroll: {
    name: 'Astral Reroll', emoji: '🌌', color: '#ea80fc', rarity: 'Mythic', art: 'astral', mutation: 'astral',
    desc: () => `Pick a pet: it becomes 🌌 ASTRAL x${mutationInfo('astral').money}!`,
    where: 'Open a ☄️ Meteoric Chest (1% chance)',
    mutate: (pet) => (hasMutation(pet, 'astral') ? null : 'astral'),
    canUse: (pet) => !hasMutation(pet, 'astral'),
  },
  // 🧰 寶箱（小朋友 2026-10-22）：買咗入背包，放上快捷欄，撳滑鼠／E 開（chests.js），唔係變異用
  // chest: true = 背包「Use」／快捷欄 E 係開箱，唔係揀寵物
  zombieChest: {
    name: 'Zombified Chest', emoji: '🧟', color: '#76ff03', rarity: 'Epic', chest: true,
    desc: () => 'Put it in your hotbar and click to open it! Candy Corn or a NEW spooky pet inside.',
    where: "Buy it from 🐕 Echo in the Halloween World (500 🌽)",
    mutate: () => null,
    canUse: () => false,
  },
  meteorChest: {
    name: 'Meteoric Chest', emoji: '🧰', color: '#40c4ff', rarity: 'Legendary', chest: true,
    desc: () => 'Put it in your hotbar and click to open it! A NEW Meteoric pet or a super rare 🌌 Astral Reroll inside.',
    where: 'Buy it at the ☄️ Meteoric Shop (100 💎)',
    mutate: () => null,
    canUse: () => false,
  },
  // 😈 Demonic Chest（小朋友 Issue #11）：Witch Tower 獎品；開出 5 隻 Demonic 寵物（機會率：balance.js DEMONIC_CHEST_DROPS）
  demonicChest: {
    name: 'Demonic Chest', emoji: '😈', color: '#ff3d00', rarity: 'Legendary', chest: true,
    desc: () => 'Put it in your hotbar and click to open it! A NEW Demonic pet inside: Imp, Toro, Demonic Whale, Skeleton Horseman or the super rare Lava Cerberus!',
    where: 'Win it in the 🧙 Witch Tower',
    mutate: () => null,
    canUse: () => false,
  },
};
export const isChestGear = (type) => !!GEARS[type]?.chest;

// 💎 每個變異一粒 Shard（小朋友 2026-10-22）：未有專屬 Shard 嘅變異（🔥 fire、🌑 eclipse、👻 spectral、🟣 phantom…）
// 自動整一個 gear 'shard_<變異>'，揀一隻寵物 → 一定變嗰個變異（加落去，唔會洗走其他變異）
// 點解每個變異一個 type（唔係一個 type + mutation 欄）：state.gears 仍然係 { type }，背包疊埋、快捷欄 key 'gear:<type>' 全部照用，唔使改舊存檔
// ☄️ meteoric 同 🌌 astral 已經有 meteoricShard／astralReroll（mutation 欄），唔再整多一粒
// 將來 MUTATIONS 加新變異 → 自動有新 Shard（樣用變異顏色，想要專屬樣喺 gearArt.js STYLES 加）
const SHARD_RARITY = { fire: 'Epic', eclipse: 'Legendary', spectral: 'Epic', phantom: 'Legendary', demonic: 'Mythic' };
const SHARD_WHERE = { demonic: 'Win it in the 🧙 Witch Tower' }; // 😈 Demonic Shard（Issue #11）
const niceName = (m) => mutationInfo(m).name[0] + mutationInfo(m).name.slice(1).toLowerCase();
for (const m of MUTATIONS) {
  if (Object.values(GEARS).some((g) => g.mutation === m)) continue;
  GEARS[`shard_${m}`] = {
    name: `${niceName(m)} Shard`, emoji: mutationInfo(m).emoji, color: mutationInfo(m).color, rarity: SHARD_RARITY[m] || 'Epic', art: m, mutation: m,
    desc: () => `Pick a pet: it becomes ${mutationInfo(m).emoji} ${mutationInfo(m).name} x${mutationInfo(m).money}!`,
    where: SHARD_WHERE[m] || 'A super rare shard! (Ranger Control Panel)',
    mutate: (pet) => (hasMutation(pet, m) ? null : m),
    canUse: (pet) => !hasMutation(pet, m),
  };
}
// 變異 → 用邊種 gear（例如 'fire' → 'shard_fire'，'meteoric' → 'meteoricShard'）
export const mutationShardType = (m) => Object.keys(GEARS).find((t) => GEARS[t].mutation === m) || null;
// 所有變異 Shard（有 mutate 嘅 gear，包括 🔮 Halloween Shard）
export const isShardGear = (type) => !!GEARS[type]?.mutate && !GEARS[type].chest; // 寶箱都有 mutate（return null），唔算 Shard

export const gearInfo = (type) => GEARS[type] || { name: type, emoji: '❓', color: '#90a4ae', rarity: 'Common', desc: () => 'A mystery gear!', mutate: () => null, canUse: () => false };
export const gearCount = (type) => (state.gears || []).filter((g) => g.type === type).length;

// 疊埋：[{ type, count }]（按 GEARS 次序，唔識嘅放最後）
export function gearStacks() {
  const counts = new Map();
  for (const g of state.gears || []) counts.set(g.type, (counts.get(g.type) || 0) + 1);
  const order = Object.keys(GEARS);
  return [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => (order.indexOf(a.type) + 1 || 99) - (order.indexOf(b.type) + 1 || 99));
}

export function addGear(type, n = 1) {
  state.gears ??= [];
  for (let i = 0; i < n; i++) state.gears.push({ type });
  syncShardCount();
}

export function takeGear(type) {
  const i = (state.gears || []).findIndex((g) => g.type === type);
  if (i < 0) return false;
  state.gears.splice(i, 1);
  syncShardCount();
  return true;
}

// 舊嘅 state.hwShards（數字）照樣保留做「鏡」：🧹 Halloween HUD、🐾 側邊盒仲讀緊佢
export function syncShardCount() {
  state.hwShards = gearCount('halloweenShard');
}

// 舊存檔：以前 Shard 係一個數字 → 變返做背包入面嘅 gear
(function migrate() {
  state.gears ??= [];
  const extra = (state.hwShards || 0) - gearCount('halloweenShard');
  for (let i = 0; i < extra; i++) state.gears.push({ type: 'halloweenShard' });
  syncShardCount();
})();
