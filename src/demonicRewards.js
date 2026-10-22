// 🧙 Witch Tower 獎品 API（小朋友 Issue #11）—— 俾 Witch Tower（另一個幫手整緊）用嚟派獎
//
// ===================== 點用 =====================
//   import { giveReward, giveRewards } from './demonicRewards.js';
//
//   giveReward({ type: 'skeleTokens', amount: 25 });        // ☠️ +25 Skele Tokens（自動存檔 + 彈提示）
//   giveReward({ type: 'demonicChest' });                    // 😈 +1 Demonic Chest（入背包 Gears，快捷欄撳開）
//   giveReward({ type: 'halloweenEgg', name: 'Werewolf' });  // 🥚 指定一隻 Halloween 蛋（冇 name = 隨機抽，越稀有越少出）
//   giveRewards([{ type: 'money', amount: 1e6 }, { type: 'pumpkgrimEgg' }]); // 一次過俾幾樣（一個提示講晒）
//
//   每個都回傳 { ok, text }（text = 提示字，例如「+25 ☠️ Skele Tokens」）；type 唔識 = { ok: false }
//   amount 預設 1；quiet: true = 唔彈提示、唔出聲（自己顯示）
//
// ===================== type 一覽 =====================
//   'skeleTokens'     ☠️ Skele Tokens（state.skeleTokens）
//   'demonicChest'    😈 Demonic Chest（Gear）× amount
//   'zombieChest'     🧟 Zombified Chest（Gear）× amount
//   'halloweenEgg'    🥚 Halloween 蛋 × amount（name 可以指定；冇就隨機）→ 去 🪦 Egg Graveyard 孵
//   'lavaBloomEgg'    🌋 Lava Bloom 蛋（Legendary）× amount
//   'pumpkgrimEgg'    🎃 Pumpkgrim 蛋（Mythic）× amount
//   'candyCorn'       🌽 Candy Corn
//   'souls'           💀 Souls（state.soulDust）
//   'soulCandy'       🍬 Soul Candy（state.soulCandy；Halloween World 2 嘅幫手會用，未有就淨係存住個數）
//   'demonicSkin'     😈 Demonic Ranger 皮膚（解鎖 + 即刻着；已經有 = 改俾 25 Skele Tokens）
//   'demonicBossSkin' 😈 Demonic Boss Skin（解鎖；已經有 = 改俾 25 Skele Tokens）
//   'demonicShard'    😈 Demonic Shard（Gear）× amount：揀一隻寵物 → 😈 DEMONIC x10
//   'money'           💰 錢
//   'speed' / 'iq'    ⚡ Speed / 🧠 IQ
//   'jump'            🦘 Jump Power（state.jumpPower）
//   'pet'             🐾 一隻寵物（name 一定要有，例如 { type: 'pet', name: 'Lava Cerberus' }）
//
// 其他 export：
//   giveHalloweenEgg(name, n = 1)   直接放蛋入背囊（state.hwEggs）
//   unlockDemonicSkin({ wear = true })、unlockDemonicBossSkin()   解鎖（回傳 true = 新解鎖）
//   setDemonicHooks({ equipRanger })   main.js 一開始設定（換皮膚要用 thirdPerson）

import { state, save } from './state.js';
import { addGear } from './data/gears.js';
import { findAnimal, randomKg, HALLOWEEN_PETS } from './data/animals.js';
import { HALLOWEEN_EGG_WEIGHT } from './data/halloween.js';
import { INDEX_NEW_SPECIES_REWARD } from './data/balance.js';
import { RANGER_SKINS } from './skins.js';
import { popup, announce, renderHotbar } from './hud.js';
import { play } from './sound.js';
import { short } from './format.js';

const DUPLICATE_SKIN_TOKENS = 25; // 已經有嗰個皮膚：改俾幾多 Skele Tokens
const hooks = { equipRanger: null };
export function setDemonicHooks(h) {
  Object.assign(hooks, h);
}

// ---------- 🥚 蛋 ----------
export function giveHalloweenEgg(name, n = 1) {
  const info = findAnimal(name);
  if (!info?.halloween || !(info.hatchSeconds > 0)) return false; // 淨係可以孵嘅蛋寵物（Halloween 蛋 + Witch Tower 蛋）
  state.hwEggs = [...(state.hwEggs || []), ...Array.from({ length: n }, () => ({ name, rarity: info.rarity }))];
  save();
  return true;
}
// 隨機抽一隻 Halloween 蛋（同魚竿一樣嘅比重）
function randomHalloweenEgg() {
  const total = HALLOWEEN_PETS.reduce((s, p) => s + (HALLOWEEN_EGG_WEIGHT[p.rarity] || 0), 0);
  let r = Math.random() * total;
  return (HALLOWEEN_PETS.find((p) => (r -= HALLOWEEN_EGG_WEIGHT[p.rarity] || 0) < 0) || HALLOWEEN_PETS[0]).name;
}

// ---------- 😈 皮膚 ----------
const demonicSkin = () => RANGER_SKINS.find((s) => s.id === 'demonic');
export function unlockDemonicSkin({ wear = true } = {}) {
  const fresh = !state.ownedRanger?.includes('demonic');
  if (fresh) state.ownedRanger = [...(state.ownedRanger || ['ranger']), 'demonic'];
  if (wear) {
    state.rangerSkin = 'demonic';
    hooks.equipRanger?.(demonicSkin());
  }
  save();
  return fresh;
}
export function unlockDemonicBossSkin() {
  const fresh = !state.demonicBossSkin;
  state.demonicBossSkin = true;
  save();
  return fresh;
}

// ---------- 🎁 俾獎 ----------
const plural = (n, word) => `${short(n)} ${word}${n === 1 ? '' : 's'}`;
const add = (key, n) => (state[key] = (state[key] || 0) + n);

// 每種獎：做嘢 + 回傳提示字（null = 唔得）；big = 大獎（大字 + 特別聲）
const TYPES = {
  skeleTokens: (n) => (add('skeleTokens', n), `+${short(n)} ☠️ Skele Tokens`),
  demonicChest: (n) => (addGear('demonicChest', n), `+${plural(n, '😈 Demonic Chest')} (in your 🎒)`),
  zombieChest: (n) => (addGear('zombieChest', n), `+${plural(n, '🧟 Zombified Chest')} (in your 🎒)`),
  halloweenEgg: (n, r) => {
    const names = Array.from({ length: n }, () => r.name || randomHalloweenEgg());
    for (const nm of names) if (!giveHalloweenEgg(nm)) return null;
    const one = new Set(names).size === 1;
    return `+${n === 1 ? '' : `${n} `}🥚 ${one ? names[0] : 'Halloween'} Egg${n === 1 ? '' : 's'}! Hatch at the 🪦 Egg Graveyard`;
  },
  lavaBloomEgg: (n) => (giveHalloweenEgg('Lava Bloom', n), `+${n === 1 ? '' : `${n} `}🌋 Lava Bloom Egg${n === 1 ? '' : 's'} (Legendary)! Hatch at the 🪦 Egg Graveyard`),
  pumpkgrimEgg: (n) => (giveHalloweenEgg('Pumpkgrim', n), `+${n === 1 ? '' : `${n} `}🎃 Pumpkgrim Egg${n === 1 ? '' : 's'} (Mythic)! Hatch at the 🪦 Egg Graveyard`),
  candyCorn: (n) => (add('candyCorn', n), `+${short(n)} 🌽 Candy Corn`),
  souls: (n) => (add('soulDust', n), `+${short(n)} 💀 Souls`),
  soulCandy: (n) => (add('soulCandy', n), `+${short(n)} 🍬 Soul Candy`),
  demonicSkin: () => {
    if (!unlockDemonicSkin({ wear: true })) return add('skeleTokens', DUPLICATE_SKIN_TOKENS), `You already have the 😈 Demonic Ranger skin: +${DUPLICATE_SKIN_TOKENS} ☠️ Skele Tokens instead`;
    return '😈 NEW SKIN: Demonic Ranger! Walk to FLY, jump for a FIRE BOOST!';
  },
  demonicBossSkin: () => {
    if (!unlockDemonicBossSkin()) return add('skeleTokens', DUPLICATE_SKIN_TOKENS), `You already have the 😈 Demonic Boss Skin: +${DUPLICATE_SKIN_TOKENS} ☠️ Skele Tokens instead`;
    return '😈 NEW: Demonic Boss Skin! Go to any Boss and press E to change its look!';
  },
  demonicShard: (n) => (addGear('shard_demonic', n), `+${plural(n, '😈 Demonic Shard')}: use it on a pet for DEMONIC x10!`),
  money: (n) => (add('money', n), `+$${short(n)}`),
  speed: (n) => (add('speed', n), `+${short(n)} ⚡ Speed`),
  iq: (n) => (add('iq', n), `+${short(n)} 🧠 IQ`),
  jump: (n) => (add('jumpPower', n), `+${short(n)} 🦘 Jump Power`),
  pet: (n, r) => {
    const info = findAnimal(r.name);
    if (!info) return null;
    for (let i = 0; i < n; i++) state.pets.push({ name: info.name, biome: info.biome, kg: randomKg(info), rarity: info.rarity || 'Common', onPlot: false });
    let bonus = '';
    if (!state.indexFound.includes(info.name)) {
      state.indexFound.push(info.name);
      const reward = INDEX_NEW_SPECIES_REWARD[info.biome] || 0;
      state.money += reward;
      if (reward) bonus = ` 📖 NEW! +$${short(reward)}`;
    }
    return `+${n === 1 ? '' : `${n} `}${info.emoji || '🐾'} ${info.name}${n === 1 ? '' : 's'}!${bonus}`;
  },
};
const BIG = new Set(['demonicSkin', 'demonicBossSkin', 'pumpkgrimEgg', 'lavaBloomEgg', 'pet']);
export const REWARD_TYPES = Object.keys(TYPES);

function giveOne(r) {
  const fn = TYPES[r?.type];
  const n = Math.max(1, Math.floor(Number(r?.amount ?? 1)) || 1);
  if (!fn) {
    console.warn('giveReward: unknown type', r?.type);
    return { ok: false, text: '' };
  }
  const text = fn(['money', 'speed', 'iq', 'jump', 'skeleTokens', 'candyCorn', 'souls', 'soulCandy'].includes(r.type) ? Math.max(0, Number(r.amount ?? 1)) : n, r);
  return text ? { ok: true, text, big: BIG.has(r.type) } : { ok: false, text: '' };
}

export function giveReward(r) {
  const res = giveOne(r);
  if (!res.ok) return res;
  save();
  renderHotbar();
  if (!r.quiet) {
    if (res.big) announce(`🧙 ${res.text}`);
    else popup(`🎁 ${res.text}`);
    play(res.big ? 'demonic' : 'coin');
  }
  return res;
}

export function giveRewards(list, { quiet = false } = {}) {
  const done = (list || []).map(giveOne).filter((x) => x.ok);
  if (!done.length) return { ok: false, text: '' };
  save();
  renderHotbar();
  const text = done.map((x) => x.text).join(' · ');
  const big = done.some((x) => x.big);
  if (!quiet) {
    if (big) announce(`🧙 ${text}`);
    else popup(`🎁 ${text}`);
    play(big ? 'demonic' : 'coin');
  }
  return { ok: true, text, big };
}

if (import.meta.env?.DEV) window.towerRewards = { giveReward, giveRewards, giveHalloweenEgg, unlockDemonicSkin, unlockDemonicBossSkin, REWARD_TYPES }; // 測試：towerRewards.giveReward({ type: 'demonicChest', amount: 3 })
