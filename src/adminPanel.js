// 🔐 Secret Ranger Control Panel（小朋友 2026-10-18）：秘密沙灘嗰粒掣（同以前橋下面個紅掣合埋做一粒）
// 好似管理員面板：提早開新嘢、攞任何寵物、成本 Index、Max 晒、開活動、喺生態區出指定稀有度
// Issue #10（小朋友 2026-10-21）：可以俾 🌽 Candy Corn、💎 Meteor Crystals 等等貨幣；面板整靚啲：
//   分頁清楚啲、寵物搜尋、快速掣（+100／+1K／+1M／MAX）、所有活動（直接讀 events.js 個 EVENTS）、傳送、測試開關
// 🎒 Gears 分頁（小朋友 2026-10-22）：俾任何 Shard（每粒有自己個樣，src/gearArt.js）、寶箱、Boost；清走所有 Gear
//   全部直接讀 GEARS（data/gears.js）：其他檔案加新 gear type 就自動出現
// 第一次改嘢之前會備份真存檔（SAVE_KEY + '-backup'），可以一撳還原
// Issue #14（小朋友 2026-10-23）：要打密碼先開到（adminGate.js，打啱一次永遠解鎖），之後撳 Q 開；
//   成個面板變未來感（adminPanel.css）；Gears 分頁加 🔫 武器（直接讀 WEAPONS）、🥚 蛋、🧰 工具；
//   新 🎨 Skins 分頁：所有 Ranger／寵物／Boss 皮膚，可以俾、着、鎖返（測試用）
import { state, save, SAVE_KEY, autoBackups, restoreAutoBackup } from './state.js';
import { short } from './format.js';
import { play } from './sound.js';
import { ANIMALS, FUSE_PETS, HALLOWEEN_PETS, CHEST_PETS, METEOR_PETS, DEMONIC_PETS, MUTATIONS, mutationInfo, joinMutations, sizeText, findAnimal, randomKg } from './data/animals.js';
import { RARITIES, NEW_BIOME_DATE, FUSE_OPEN_DATE, GYM_OPEN_DATE, HALLOWEEN_OPEN_DATE, METEOR_OPEN_DATE, FISHING_RODS, GHOST_VACUUM } from './data/balance.js';
import { BIOMES } from './data/biomeList.js';
import { EVENTS } from './events.js';
import { petPic } from './animalPics.js';
import { GEARS, gearInfo, gearCount, addGear, takeGear, isShardGear, syncShardCount } from './data/gears.js';
import { gearPic } from './gearArt.js';
import { giveReward, giveHalloweenEgg } from './demonicRewards.js'; // 🧙 Witch Tower 獎品（Issue #11）
import { WEAPONS } from './data/weapons.js'; // 🔫 其他幫手加新武器就自動出現
import { RANGER_SKINS, PET_SKINS } from './skins.js';
import { setBossSkin } from './demonicBossSkin.js';
import { toolFlags, renderHotbar } from './hud.js';
import { adminUnlocked, unlockAdmin, checkPassword, gateHtml } from './adminGate.js'; // 🔐 Issue #14 密碼

const $ = (id) => document.getElementById(id);
const fmt = short; // K／M／B／T（src/format.js）
let actions = null;
let tab = 'give';
let confirm = null; // 撳兩下先做：例如 'index'、'max'
const pick = { name: ANIMALS[0].name, rarity: 'Mythic', size: 1, mutations: [], flipped: false };
let spawnBiome = 0;
let spawnRarity = 'Mythic';
let search = ''; // 🔍 寵物搜尋（重畫都記住）
let group = 'all'; // 寵物分類
let towerFloor = 5; // 🗼 Witch Tower：跳去第幾層

export function setAdminActions(a) {
  actions = a;
  popup = a.popup || null;
}

const isOpen = () => $('panel').dataset.kind === 'admin';
const dateText = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

const TABS = [
  ['give', '💰 Give'],
  ['pets', '🐾 Pets'],
  ['gears', '🎒 Gears'],
  ['skins', '🎨 Skins'],
  ['world', '🌍 Teleport'],
  ['events', '🎉 Events'],
  ['future', '🔓 Unlocks'],
  ['max', '⚡ Max'],
  ['safety', '💾 Safety'],
];

function confirmButton(id, label, extra = '') {
  return confirm === id
    ? `<button data-admin="${id}" ${extra} class="sell">Sure? Yes, do it!</button> <button data-admin="cancel" class="grey">Cancel</button>`
    : `<button data-admin="ask" data-what="${id}" ${extra}>${label}</button>`;
}
const section = (title, body, note = '') => `<section class="admin-sec"><h3>${title}</h3>${body}${note ? `<p class="hint">${note}</p>` : ''}</section>`;

// ---------- 💰 Give：所有貨幣 ----------
// key = state 入面個名；max = 撳 MAX 去到幾多；hw = Halloween 嘢（分開一組）
const CURRENCIES = [
  { key: 'money', emoji: '💰', name: 'Money', max: 1e15 },
  { key: 'iq', emoji: '🧠', name: 'IQ', max: 1e12 },
  { key: 'speed', emoji: '⚡', name: 'Speed', max: 1e12 },
  { key: 'jumpPower', emoji: '🦘', name: 'Jump Power', max: 300, steps: [10, 50, 100] },
  { key: 'tokens', emoji: '🎟️', name: 'Skin Tokens', max: 1e6 },
  { key: 'candyCorn', emoji: '🌽', name: 'Candy Corn', max: 1e9, hw: true },
  { key: 'soulDust', emoji: '💀', name: 'Soul Dust (Souls)', max: 1e9, hw: true },
  { key: 'hwShards', emoji: '🔮', name: 'Halloween Shards', max: 999, steps: [1, 10, 100], hw: true },
  { key: 'soulCandy', emoji: '🍬', name: 'Soul Candy', max: 999, steps: [1, 5, 10], hw: true }, // 🔥 5 粒開 Halloween World 2（Issue #11）
  { key: 'skeleTokens', emoji: '☠️', name: 'Skele Tokens', max: 1e9, hw: true }, // 🧙 Witch Tower（Issue #11）
  { key: 'meteorCrystals', emoji: '💎', name: 'Meteor Crystals', max: 1e9 },
];
const STEPS = [100, 1e3, 1e6];
const stepLabel = (n) => `+${n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}K` : n}`;
// 「5K」「2.5M」「1e9」都明
function parseAmount(text) {
  const m = String(text).trim().toUpperCase().replace(/[,_\s$]/g, '').match(/^(\d*\.?\d+(?:E\d+)?)([KMBT]?)$/);
  if (!m) return null;
  const n = Number(m[1]) * ({ '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2]]);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}
function setCurrency(key, value) {
  if (key === 'hwShards') return setGearCount('halloweenShard', value); // 🔮 Halloween Shard 而家係背包 Gear（hwShards 只係鏡）
  state[key] = Math.max(0, Math.floor(value));
  save();
  play('coin');
}

function currencyRow(c) {
  const steps = c.steps || STEPS;
  return `<div class="admin-cur">
      <div class="admin-cur-name"><span class="admin-cur-emoji">${c.emoji}</span><b>${c.name}</b><span class="admin-cur-val">${fmt(state[c.key] || 0)}</span></div>
      <div class="admin-cur-btns">
        ${steps.map((n) => `<button data-admin="add" data-k="${c.key}" data-v="${n}">${stepLabel(n)}</button>`).join('')}
        <button data-admin="add" data-k="${c.key}" data-v="max" class="sell">MAX</button>
        <button data-admin="add" data-k="${c.key}" data-v="zero" class="grey" title="Set to 0">0</button>
        <span class="admin-set"><input id="admin-num-${c.key}" inputmode="decimal" placeholder="e.g. 5K" aria-label="${c.name} amount"><button data-admin="setcur" data-k="${c.key}">Set</button></span>
      </div>
    </div>`;
}

function giveHtml() {
  return `<p class="index-summary">Give yourself anything. Type a number like <b>5000</b>, <b>5K</b> or <b>2.5M</b> and tap <b>Set</b>.</p>
    ${section('🌳 Normal world', CURRENCIES.filter((c) => !c.hw).map(currencyRow).join(''))}
    ${section('🎃 Halloween world', CURRENCIES.filter((c) => c.hw).map(currencyRow).join(''))}
    ${section('🚀 Everything at once', `<div class="pet-actions">${confirmButton('rich', '💰 Huge Money, Speed, IQ and Jump Power')}</div>`)}`;
}

// ---------- 🎒 Gears：Shard、寶箱、Boost ----------
const GEAR_MAX = 999;
function setGearCount(type, n) {
  n = Math.min(GEAR_MAX, Math.max(0, Math.floor(n)));
  const now = gearCount(type);
  if (n > now) addGear(type, n - now);
  else for (let i = now; i > n; i--) takeGear(type);
  save();
  play('coin');
}
function gearCard(type) {
  const g = gearInfo(type);
  const n = gearCount(type);
  return `<div class="card-animal admin-gear" style="border-color:${g.color}">${gearPic(type)}<b>${g.name}</b>
    <small style="color:${g.color}">${g.rarity} · You have ${n}</small>
    <div class="pet-actions admin-gear-btns">
      <button data-admin="gear" data-type="${type}" data-v="1">+1</button><button data-admin="gear" data-type="${type}" data-v="10">+10</button>
      <button data-admin="gear" data-type="${type}" data-v="zero" class="grey" title="Remove all">0</button>
    </div></div>`;
}
// ⏱️ Boost（另一個幫手整緊 state.boosts）：佢可以喺 adminExtras.boosts 話我知有咩 Boost、點俾
//   adminExtras.boosts = { list: () => [{ id, emoji, name }], give: (id, minutes) => {} }
// 未有就試吓直接讀 state.boosts（{ id: 完結時間 ms } 或者 { id: { until } }），再冇就唔顯示
export const adminExtras = {};
const BOOST_MINUTES = [5, 30, 60];
function boostList() {
  if (adminExtras.boosts) return adminExtras.boosts.list();
  if (!state.boosts || typeof state.boosts !== 'object' || Array.isArray(state.boosts)) return [];
  return Object.keys(state.boosts).map((id) => ({ id, emoji: '⏱️', name: id }));
}
function giveBoost(id, minutes) {
  if (adminExtras.boosts) return adminExtras.boosts.give(id, minutes);
  const add = minutes * 60e3;
  const v = state.boosts[id];
  const field = v && typeof v === 'object' ? ['until', 'endsAt', 'end'].find((k) => typeof v[k] === 'number') : null;
  if (typeof v === 'number') state.boosts[id] = Math.max(Date.now(), v) + add;
  else if (field) v[field] = Math.max(Date.now(), v[field]) + add;
  else return popup?.('⏱️ Not sure how to give that boost yet!');
  save();
  play('coin');
}
let popup = null; // main.js 個 popup（經 actions）
function gearsHtml() {
  const types = Object.keys(GEARS);
  const shards = types.filter(isShardGear);
  const others = types.filter((t) => !isShardGear(t));
  const total = (state.gears || []).length;
  const boosts = boostList();
  return `<p class="index-summary">🎒 You have <b>${total}</b> gear${total === 1 ? '' : 's'}. They go into the <b>⚙️ Gears</b> tab of your Inventory (press <kbd>\`</kbd>).</p>
    ${weaponsSection()}
    ${section('💎 Mutation Shards', `<div class="cards admin-cards admin-gear-cards">${shards.map(gearCard).join('')}</div>
      <div class="pet-actions"><button data-admin="allShards" class="sell">🎁 Give me 1 of every shard</button></div>`, 'Use a shard on a pet in your Inventory to give it that mutation!')}
    ${section('🧰 Chests and more', others.length ? `<div class="cards admin-cards admin-gear-cards">${others.map(gearCard).join('')}</div>` : '<p class="hint">No chests yet. New gears show up here by themselves!</p>')}
    ${boosts.length ? section('⏱️ Boosts', boosts.map((b) => `<div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">${b.emoji}</span><b>${b.name}</b></div>
      <div class="admin-cur-btns">${BOOST_MINUTES.map((m) => `<button data-admin="boost" data-id="${b.id}" data-v="${m}">+${m} min</button>`).join('')}<button data-admin="boostStop" data-id="${b.id}" class="grey" title="Stop this boost">Stop</button></div></div>`).join('')
      + '<div class="pet-actions admin-wrap"><button data-admin="boostAll" class="sell">⏱️ +30 min of EVERY boost</button><button data-admin="boostStopAll" class="grey">Stop all boosts</button></div>') : ''}
    ${eggsSection()}
    ${toolsSection()}
    ${section('🗑️ Clear', `<div class="pet-actions">${confirmButton('clearGears', '🗑️ Remove ALL my gears')}</div>`)}`;
}

// 🔫 魔法武器：直接讀 WEAPONS（其他幫手加新武器就自動有）；淨係喺戰鬥區（Witch Tower／Boss 大廳）先攞出嚟
const weaponIds = () => Object.keys(WEAPONS);
const hasWeapon = (id) => (state.weapons || []).includes(id);
function weaponsSection() {
  const card = (id) => {
    const w = WEAPONS[id];
    const own = hasWeapon(id);
    const color = `#${(w.color ?? 0x40ffd0).toString(16).padStart(6, '0')}`;
    return `<div class="card-animal admin-weapon ${own ? 'equipped' : ''}" style="--wc:${color}"><span class="admin-weapon-emoji">${w.emoji || '🔫'}</span><b>${w.name}</b>
      <small>💥 ${w.damage} damage · ${w.auto ? 'Auto' : 'Tap'} · ${w.mag} shots</small>
      <div class="pet-actions admin-gear-btns">${own ? `<button class="grey" data-admin="noop">✔ Have it</button><button data-admin="weaponTake" data-id="${id}" class="grey" title="Remove (for testing)">✕</button>` : `<button data-admin="weaponGive" data-id="${id}">🎁 Give</button>`}</div></div>`;
  };
  const all = weaponIds().every(hasWeapon);
  return section('🔫 Magic Weapons', `<div class="cards admin-cards admin-gear-cards">${weaponIds().map(card).join('')}</div>
    <div class="pet-actions admin-wrap"><button data-admin="weaponAll" class="${all ? 'grey' : 'sell'}">${all ? '✔ You have every weapon' : '🎁 Give me EVERY weapon'}</button><button data-admin="weaponNone" class="grey">✕ Remove all weapons</button></div>`,
  'Weapons come out in the 🗼 Witch Tower and the Boss hall (they show in your hotbar there).');
}

// 🥚 蛋：所有可以孵嘅蛋寵物（Halloween 蛋 + Witch Tower 蛋），去 🪦 Egg Graveyard 孵
const eggPets = () => GROUPS[0][2]().filter((a) => a.halloween && a.hatchSeconds > 0);
function eggsSection() {
  const eggs = state.hwEggs || [];
  const count = (name) => eggs.filter((e) => e.name === name).length;
  return section(`🥚 Eggs <small class="admin-count">${eggs.length} in your bag</small>`, `<div class="cards admin-cards admin-gear-cards">${eggPets().map((a) => `<div class="card-animal admin-egg">${petPic(a.name, { rarity: a.rarity })}<b>${a.name}</b>
      <small>${a.rarity} · You have ${count(a.name)}</small><div class="pet-actions admin-gear-btns"><button data-admin="egg" data-name="${a.name}" data-v="1">+1</button><button data-admin="egg" data-name="${a.name}" data-v="5">+5</button></div></div>`).join('')}</div>
    <div class="pet-actions admin-wrap"><button data-admin="eggAll" class="sell">🎁 1 of every egg</button>${confirmButton('eggClear', '🗑️ Remove all eggs')}</div>`,
  'Eggs hatch at the 🪦 Egg Graveyard in the Halloween World.');
}

// 🧰 工具：鎚仔、魚竿、吸塵機
function toolsSection() {
  const rod = Number.isInteger(state.rod) ? state.rod : 0;
  const vac = state.vacuumLevel || 0;
  return section('🧰 Tools', `<div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">🔨</span><b>Hammer</b><span class="admin-cur-val ${state.hasHammer ? '' : 'off'}">${state.hasHammer ? 'YES' : 'NO'}</span></div>
      <div class="admin-cur-btns"><button data-admin="hammer" class="${state.hasHammer ? 'grey' : ''}">${state.hasHammer ? '✕ Take it away' : '🎁 Give'}</button></div></div>
    <div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">🎣</span><b>Fishing Rod</b><span class="admin-cur-val">${FISHING_RODS[rod]?.name || rod}</span></div>
      <div class="admin-cur-btns"><button data-admin="rod" data-v="-1" class="grey">◂</button><button data-admin="rod" data-v="1">▸</button><button data-admin="rod" data-v="max" class="sell">BEST</button></div></div>
    <div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">🧹</span><b>Ghost Vacuum</b><span class="admin-cur-val">${vac ? `Lv ${vac}` : 'None'}</span></div>
      <div class="admin-cur-btns">${[0, ...GHOST_VACUUM.map((_, i) => i + 1)].map((lv) => `<button data-admin="vacuum" data-v="${lv}" class="${lv === vac ? '' : 'grey'}">${lv ? `Lv ${lv}` : '0'}</button>`).join('')}</div></div>`,
  'Changing the vacuum reloads the game so it looks right.');
}

// ---------- 🎨 Skins：Ranger、寵物、Boss 皮膚 ----------
// Boss 皮膚：每款一個 state 開關（meteorBossSkin.js／demonicBossSkin.js）；加新款就喺度加一行
const BOSS_SKINS = [
  { id: 'meteoric', emoji: '☄️', name: 'Meteoric Boss Skin', key: 'meteorBossSkin' },
  { id: 'demonic', emoji: '😈', name: 'Demonic Boss Skin', key: 'demonicBossSkin' },
];
const skinTag = (s) => (s.meteor ? '☄️ Meteoric Shop' : s.tower ? '🧙 Witch Tower' : s.cost ? `🎟️ ${s.cost}` : 'Free');
const baseSkin = (kind) => (kind === 'ranger' ? 'ranger' : 'none');
const ownedList = (kind) => (kind === 'ranger' ? (state.ownedRanger ||= ['ranger']) : (state.ownedPet ||= ['none']));
function skinCard(kind, s) {
  const wearing = (kind === 'ranger' ? state.rangerSkin : state.petSkin) === s.id;
  const base = s.id === baseSkin(kind);
  const has = ownedList(kind).includes(s.id) || base;
  return `<div class="card-animal admin-skin ${wearing ? 'equipped' : ''} ${has ? '' : 'locked'}"><b>${s.name}</b><small>${has ? (wearing ? '✔ Wearing' : '✔ Unlocked') : `🔒 ${skinTag(s)}`}</small>
    <div class="pet-actions admin-gear-btns">${wearing ? '' : `<button data-admin="skinWear" data-kind="${kind}" data-id="${s.id}">${has ? '👕 Wear' : '🎁 Wear'}</button>`}${!has ? `<button data-admin="skinGive" data-kind="${kind}" data-id="${s.id}" class="grey" title="Unlock only">🔓</button>` : base ? '' : `<button data-admin="skinLock" data-kind="${kind}" data-id="${s.id}" class="grey" title="Lock it again (for testing)">🔒</button>`}</div></div>`;
}
function skinsHtml() {
  const bossRow = (b) => {
    const on = !!state[b.key];
    const worn = Object.values(state.bossSkins || {}).filter((v) => v === b.id).length;
    return `<div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">${b.emoji}</span><b>${b.name}</b><span class="admin-cur-val ${on ? '' : 'off'}">${on ? 'UNLOCKED' : 'LOCKED'}</span></div>
      <div class="admin-cur-btns"><button data-admin="bossSkin" data-id="${b.id}" class="${on ? 'grey' : 'sell'}">${on ? '🔒 Lock' : '🔓 Unlock'}</button>
      <button data-admin="bossWear" data-id="${b.id}">🦹 Put on every Boss${worn ? ` (${worn} now)` : ''}</button></div></div>`;
  };
  const allOf = (kind, list) => list.every((s) => ownedList(kind).includes(s.id));
  const group = (kind, list, title, back) => section(title, `<div class="cards admin-cards admin-skin-cards">${list.map((s) => skinCard(kind, s)).join('')}</div>
      <div class="pet-actions admin-wrap"><button data-admin="skinAll" data-kind="${kind}" class="${allOf(kind, list) ? 'grey' : 'sell'}">${allOf(kind, list) ? '✔ All unlocked' : `🎁 Unlock ALL ${kind} skins`}</button>${confirmButton(`skinReset-${kind}`, `🔒 Lock all (back to ${back})`)}</div>`);
  return `<p class="index-summary">Unlock, wear or lock any skin. In the shops they cost 🎟️ Skin Tokens or 💎, here they are free!</p>
    ${group('ranger', RANGER_SKINS, '🧑 Ranger skins', 'Classic')}
    ${group('pet', PET_SKINS, '🐾 Pet skins', 'Natural')}
    ${section('🦹 Boss skins', `${BOSS_SKINS.map(bossRow).join('')}
      <div class="pet-actions admin-wrap"><button data-admin="bossWear" data-id="normal" class="grey">↩️ Every Boss back to normal</button></div>`, 'You can also walk up to a Boss and press E to change just that one.')}`;
}

// ---------- 🔓 Unlocks + 測試開關 ----------
// 🔮 所有有日期嘅新嘢：加一個新更新（例如 Halloween）就喺度加一行，再喺 main.js 嘅 unlockAll 開埋佢
// open：到咗日期未；early：提早開咗未
const ECHO_QUESTS_DATE = '2026-10-24';
const FUTURE = [
  // 🧪 Fuse、👑 Enchanted Kingdom、☄️ Meteoric 已經出咗（小朋友 2026-10-24：控制面板唔使再有佢哋嘅提早開）
  { emoji: '💪', name: 'Ranger Gym', date: GYM_OPEN_DATE, open: (s) => s.gymDate, early: () => state.gymEarly && actions.status().gymPresent },
  { emoji: '🎃', name: 'Halloween World', date: HALLOWEEN_OPEN_DATE, open: (s) => s.halloweenDate, early: () => state.halloweenEarly },
  // 🐕 Echo 嘅 Halloween 任務（另一個幫手整緊；state.echoQuestsEarly = 提早開）
  { emoji: '🐕', name: "Echo's Halloween Quests", date: ECHO_QUESTS_DATE, open: () => new Date().toLocaleDateString('en-CA') >= ECHO_QUESTS_DATE && !state.echoQuestsEarly, early: () => state.echoQuestsEarly },
];

function futureHtml() {
  const s = actions.status();
  const row = (f) => `<tr><td>${f.emoji} <b>${f.name}</b></td><td>${dateText(f.date)}</td><td>${f.open(s) ? '✅ Open' : f.early() ? '🔓 Unlocked early' : '🔒 Coming soon'}</td></tr>`;
  const allDone = FUTURE.every((f) => f.open(s) || f.early());
  const flags = actions.flags();
  return `${section('📅 Coming soon', `<div class="admin-table"><table>${FUTURE.map(row).join('')}</table></div>
    <div class="pet-actions">${allDone ? '<button class="grey" data-admin="noop">✔ Everything is unlocked!</button>' : s.gymPresent ? '<button data-admin="unlockAll" class="sell big-unlock">🚀 Unlock ALL future updates</button>' : confirmButton('unlockAll', '🚀 Unlock ALL future updates (skips the Lab boss!)', 'class="big-unlock"')}</div>
    <div class="pet-actions">
      ${s.gymPresent ? '<button data-admin="gotoGym">🏃 Take me to the Gym</button>' : confirmButton('gotoGym', '🏃 Take me to the Gym (skips the Lab boss!)')}
    </div>`, s.gymPresent ? '' : 'The Gym is where the Lab is. Going there now skips the Mutated Scientist Poacher fight, and the Lab will be gone.')}
    ${section('🔧 Test switches', `<div class="admin-flags">${flags.map((f) => `<button data-admin="flag" data-id="${f.id}" class="admin-flag ${f.on ? 'on' : ''}" title="${f.hint || ''}"><span class="admin-switch"></span>${f.label}<small>${f.on ? 'ON' : 'OFF'}</small></button>`).join('')}</div>`, 'Tap a switch to turn it on or off.')}`;
}

// ---------- 🐾 Pets ----------
const findRarity = () => [...ANIMALS, ...FUSE_PETS, ...HALLOWEEN_PETS, ...CHEST_PETS, ...METEOR_PETS, ...DEMONIC_PETS].find((a) => a.name === pick.name)?.rarity || pick.rarity;
// 預覽：例如「🙃 GIANT x10 🔥🌑 Mythic Celestial Sunlion」
const previewText = () => {
  const muts = MUTATIONS.filter((m) => pick.mutations.includes(m)).map((m) => mutationInfo(m).emoji).join('');
  return [pick.flipped ? '🙃' : '', sizeText(pick.size), muts, findRarity(), pick.name].filter(Boolean).join(' ');
};
const niceName = (m) => mutationInfo(m).name[0] + mutationInfo(m).name.slice(1).toLowerCase();
const GROUPS = [
  ['all', 'All', () => [...ANIMALS, ...FUSE_PETS, ...HALLOWEEN_PETS, ...CHEST_PETS, ...METEOR_PETS, ...DEMONIC_PETS]],
  ['normal', '🌳 Animals', () => ANIMALS],
  ['fuse', '🧪 Fuse', () => FUSE_PETS],
  ['halloween', '🎃 Halloween', () => HALLOWEEN_PETS],
  ['chest', '🧟 Chest', () => CHEST_PETS],
  ['meteor', '☄️ Meteoric', () => METEOR_PETS],
  ['demonic', '😈 Witch Tower', () => DEMONIC_PETS],
];
const matches = (a) => !search || a.name.toLowerCase().includes(search.toLowerCase());

function petsHtml() {
  const list = GROUPS.find((g) => g[0] === group)[2]();
  const opt = (v, cur, label = v) => `<button data-admin="${v === cur ? 'noop' : 'set'}" data-k="__K__" data-v="${v}" class="${v === cur ? '' : 'grey'}">${label}</button>`;
  const choose = (k, vals, cur, labels) => vals.map((v, i) => opt(v, cur, labels?.[i]).replace('__K__', k)).join('');
  return `<div class="admin-pet-top">
      <div class="admin-pick">${petPic(pick.name, { rarity: findRarity() })}<div><small>You'll get</small><b id="admin-preview">${previewText()}</b></div></div>
      <button data-admin="give" class="sell admin-give">🎁 Give me this pet</button>
    </div>
    ${section('🎨 Rarity', `<div class="pet-actions admin-wrap">${choose('rarity', RARITIES.map((r) => r.name), pick.rarity)}</div>`, 'Pets with their own rarity (like Fuse or Halloween pets) keep it.')}
    ${section('📏 Size', `<div class="pet-actions admin-size">
      <input type="range" id="admin-size" min="0.25" max="10" step="0.25" value="${pick.size}">
      <span id="admin-size-num">x${pick.size}</span>
      ${[0.5, 1, 3, 10].map((v) => `<button data-admin="size" data-v="${v}" class="${v === pick.size ? '' : 'grey'}">x${v}</button>`).join('')}</div>`)}
    ${section('✨ Mutations', `<div class="pet-actions admin-wrap">${MUTATIONS.map((m) => `<button data-admin="mut" data-v="${m}" class="${pick.mutations.includes(m) ? '' : 'grey'}">${pick.mutations.includes(m) ? '✔ ' : ''}${mutationInfo(m).emoji} ${niceName(m)}</button>`).join('')}
      <button data-admin="flip" class="${pick.flipped ? '' : 'grey'}">${pick.flipped ? '✔ 🙃 Upside down' : '🙃 Upside down'}</button></div>`, 'Tap more than one to stack them! (👻 Spectral x4 and 🟣 Phantom x5 come from Halloween Shards)')}
    ${section('🔍 Pick a pet', `<div class="admin-search-row">
        <input id="admin-search" type="search" placeholder="Search pets... (e.g. panda)" value="${search.replace(/"/g, '&quot;')}" autocomplete="off">
        <span id="admin-count">${list.filter(matches).length} pets</span>
      </div>
      <div class="pet-actions admin-wrap">${GROUPS.map(([id, label]) => `<button data-admin="group" data-v="${id}" class="${id === group ? '' : 'grey'}">${label}</button>`).join('')}</div>
      <div class="cards admin-cards">${list.map((a) => `<div class="card-animal ${a.name === pick.name ? 'equipped' : ''}" data-pet="${a.name.toLowerCase()}" ${matches(a) ? '' : 'hidden'}>${petPic(a.name, { rarity: a.rarity || pick.rarity })}<b>${a.name}</b>
        <button data-admin="pick" data-name="${a.name}" class="${a.name === pick.name ? '' : 'grey'}">${a.name === pick.name ? '✔ Picked' : 'Pick'}</button></div>`).join('')}</div>
      <p class="hint" id="admin-none" ${list.some(matches) ? 'hidden' : ''}>No pets match. Try another word!</p>
      <div class="pet-actions admin-wrap">${confirmButton('everyPet', `🎁 Give me 1 of EVERY pet here (${list.length})`)}</div>`)}`;
}

// ---------- 🌍 Teleport ----------
function worldHtml() {
  const places = actions.places();
  const btn = (p) => `<button data-admin="go" data-id="${p.id}" class="${p.locked ? 'grey' : ''}" title="${p.locked || ''}">${p.emoji} ${p.name}${p.locked ? ' 🔒' : ''}</button>`;
  const groupOf = (g) => places.filter((p) => p.group === g).map(btn).join('');
  return `<p class="index-summary">Jump anywhere in one tap.</p>
    ${section('🏡 Hub and biomes', `<div class="admin-grid">${groupOf('normal')}</div>`)}
    ${section('✨ Secret places', `<div class="admin-grid">${groupOf('secret')}</div>`)}
    ${section('🎃 Halloween', `<div class="admin-grid">${groupOf('halloween')}</div>`, 'Going to the Ghost World also calls the Phantom Express, so you have 30 minutes there.')}
    ${section('🗼 Witch Tower', `<div class="pet-actions admin-wrap">${['easy', 'medium', 'hard'].map((m) => `<button data-admin="towerGo" data-mode="${m}">${{ easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' }[m]}</button>`).join('')}</div>
      <div class="admin-search-row"><span>⏩ Start at floor</span><input id="admin-tower-floor" type="number" min="1" max="999" step="1" value="${towerFloor}" style="width:90px"><button data-admin="towerFloor">⏩ Jump to floor</button></div>`, 'Goes straight into the tower (no Witch or World 2 lock). Pick a mode, or type a floor and jump (in the tower it starts that floor now).')}
    ${section('🌗 Day and night', `<div class="pet-actions admin-wrap"><button data-admin="night">🌙 Make it night now</button><button data-admin="day">☀️ Make it day now</button></div>`)}`;
}

// ---------- 🎉 Events ----------
function eventsHtml() {
  const biomes = BIOMES.map((b, i) => [i, b.name]);
  return `${section('🎉 Start an event', `<div class="admin-grid">${EVENTS.map((e) => `<button data-admin="event" data-id="${e.id}" title="${(e.desc || '').replace(/"/g, '&quot;')}">${e.emoji} ${e.name}</button>`).join('')}</div>
    <div class="admin-grid"><button data-admin="crazy" class="sell">🤪 CRAZY PET FRENZY</button><button data-admin="train">🚂 Phantom Express now</button><button data-admin="reaper" class="sell">🐉 Summon Pumpkin Reaper Dragon</button></div>`, 'Each event runs for its normal time, then the clock events come back.')}
    ${section('✨ Spawn an animal', `<div class="pet-actions admin-wrap">${biomes.map(([i, n]) => `<button data-admin="biome" data-i="${i}" class="${i === spawnBiome ? '' : 'grey'}">${i + 1}. ${n.replace(/^Biome \d+ - /, '')}</button>`).join('')}</div>
    <div class="pet-actions admin-wrap">${RARITIES.map((r) => `<button data-admin="srarity" data-v="${r.name}" class="${r.name === spawnRarity ? '' : 'grey'}">${r.name}</button>`).join('')}</div>
    <div class="pet-actions"><button data-admin="spawn" class="sell">✨ Spawn it</button></div>`, 'Eternal animals only live in the Enchanted Kingdom (biome 7).')}`;
}

// ---------- ⚡ Max + 📖 Index ----------
function maxHtml() {
  const total = ANIMALS.length;
  const found = state.indexFound.filter((n) => ANIMALS.some((a) => a.name === n)).length;
  return `${section('⚡ Upgrades', `<div class="pet-actions">${confirmButton('max', '⚡ MAX all upgrades (treadmill, table, machines, plot)')}</div>`, 'The game reloads after MAX so everything looks right.')}
    ${section('📖 Index', `<p>Your Index has <b>${found} / ${total}</b> species.</p><div class="pet-actions">${confirmButton('index', '📖 Fill in the whole Index')}</div>`, 'This marks every animal as found (no rescue rewards).')}`;
}

function safetyHtml() {
  const has = actions.hasBackup();
  let backupAt = 0;
  try {
    backupAt = JSON.parse(localStorage.getItem(`${SAVE_KEY}-backup`))?.savedAt || 0;
  } catch {
    backupAt = 0;
  }
  const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'a while ago');
  const autos = autoBackups();
  const autoRows = autos.map((a) => `<tr><td>🕒 <b>${when(a.at)}</b></td><td>💰 $${short(a.money)} · 🐾 ${a.pets} pets · 🦏 ${a.rescued} rescued</td><td>${confirmButton(`auto:${a.at}`, 'Go back to this')}</td></tr>`).join('');
  return `${section('💾 Autosaves', autos.length ? `<div class="admin-table"><table>${autoRows}</table></div>` : '<p class="hint">No autosaves yet. The game keeps one every 10 minutes (the last 5).</p>', 'Your game saves by itself every second. If something went wrong, pick a time to go back to. Your game right now is kept as an autosave too, so you can come back.')}
    ${section('🕰️ Save from before the Control Panel', `<p>Before your <b>first</b> change here, the game kept a copy of your save from <b>${when(backupAt)}</b>.</p>
    <p class="hint">⚠️ Going back to it <b>throws away everything you got since then</b> (pets, money, everything)!</p>
    ${has ? `<div class="pet-actions">${confirmButton('restore', '🕰️ Go back to that old save')}</div>` : '<p class="hint">No changes yet, so there is nothing to go back to.</p>'}`)}`;
}

export function adminHtml() {
  if (!actions) return '';
  if (!adminUnlocked()) {
    setTimeout(() => $('admin-pass')?.focus(), 30); // 一打開就可以打字
    return `<div class="admin admin-locked">${gateHtml()}</div>`;
  }
  const body = { give: giveHtml, future: futureHtml, pets: petsHtml, gears: gearsHtml, skins: skinsHtml, world: worldHtml, max: maxHtml, events: eventsHtml, safety: safetyHtml }[tab]();
  return `<div class="admin">
    <div class="tabs admin-tabs">${TABS.map(([id, label]) => `<button data-admin="tab" data-tab-id="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('')}</div>
    <div class="admin-body">${body}</div>
  </div>`;
}

const rerender = () => {
  if (!isOpen()) return;
  const body = $('panel-body');
  const y = body.scrollTop;
  body.innerHTML = adminHtml();
  body.scrollTop = y; // 撳完掣唔好彈返去頂
};

$('panel-body').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-admin]');
  if (!b || !isOpen() || !actions || !adminUnlocked()) return; // 🔐 未解鎖：淨係得密碼表格（submit 處理）
  const what = b.dataset.admin;
  const d = b.dataset;
  if (what === 'noop') return;
  if (what.startsWith('auto:')) {
    // 💾 返去一份自動備份（先將而家嘅都留一份）
    if (restoreAutoBackup(Number(what.slice(5)))) actions.reloadNoIntro();
    return;
  }
  if (what !== 'ask' && what !== 'cancel') confirm = null;
  switch (what) {
    case 'tab':
      tab = d.tabId;
      $('panel-body').scrollTop = 0;
      break;
    case 'ask': confirm = d.what; break;
    case 'cancel': break;
    case 'add': {
      actions.backup();
      const c = CURRENCIES.find((x) => x.key === d.k);
      const now = state[d.k] || 0;
      setCurrency(d.k, d.v === 'max' ? Math.max(now, c.max) : d.v === 'zero' ? 0 : now + Number(d.v));
      break;
    }
    case 'setcur': {
      const n = parseAmount($(`admin-num-${d.k}`)?.value ?? '');
      if (n === null) {
        $(`admin-num-${d.k}`)?.classList.add('bad');
        return;
      }
      actions.backup();
      setCurrency(d.k, n);
      break;
    }
    case 'unlock': actions.backup(); actions.unlockEarly(); return; // 會播開門動畫、收埋面板
    case 'flag': actions.backup(); actions.toggleFlag(d.id); break;
    case 'gotoGym': actions.backup(); actions.gotoGym(); return; // 可能會重新載入
    case 'go': actions.teleport(d.id); return;
    case 'towerGo': actions.tower(d.mode, 1); return; // 🗼
    case 'towerFloor': towerFloor = Math.max(1, Math.floor(Number($('admin-tower-floor')?.value) || 1)); actions.tower('medium', towerFloor); return;
    case 'night': actions.skipTime('night'); return;
    case 'day': actions.skipTime('day'); return;
    case 'pick': pick.name = d.name; break;
    case 'group': group = d.v; break;
    case 'set': pick[d.k] = d.v; break;
    case 'size': pick.size = Number(d.v); break;
    case 'mut': pick.mutations = pick.mutations.includes(d.v) ? pick.mutations.filter((m) => m !== d.v) : [...pick.mutations, d.v]; break;
    case 'flip': pick.flipped = !pick.flipped; break;
    case 'give': actions.backup(); actions.givePet({ name: pick.name, rarity: pick.rarity, sizeMul: pick.size === 1 ? null : pick.size, mutation: joinMutations(pick.mutations), flipped: pick.flipped }); break;
    case 'unlockAll': actions.backup(); actions.unlockAll(); return; // 可能會重新載入
    case 'index': actions.backup(); actions.allIndex(); break;
    case 'max': actions.backup(); actions.maxStuff(); return; // 重新載入
    case 'rich': actions.backup(); actions.rich(); break;
    case 'event': actions.backup(); actions.event(d.id); return;
    case 'crazy': actions.crazy(); return;
    case 'train': actions.backup(); actions.train(); return;
    case 'reaper': actions.reaper(); return; // 🐉
    case 'biome': spawnBiome = Number(d.i); break;
    case 'srarity': spawnRarity = d.v; break;
    case 'spawn': actions.spawn(spawnBiome, spawnRarity); return;
    case 'restore': actions.restore(); return;
    case 'gear': {
      actions.backup();
      setGearCount(d.type, d.v === 'zero' ? 0 : gearCount(d.type) + Number(d.v));
      break;
    }
    case 'allShards': {
      actions.backup();
      for (const t of Object.keys(GEARS).filter(isShardGear)) addGear(t, 1);
      save();
      play('magic');
      break;
    }
    case 'clearGears': {
      actions.backup();
      state.gears = [];
      syncShardCount();
      save();
      play('swoosh');
      break;
    }
    case 'boost': actions.backup(); giveBoost(d.id, Number(d.v)); break;
    case 'tower': actions.backup(); giveReward({ type: d.type }); break; // 🧙
    case 'boostStop': actions.backup(); stopBoost(d.id); break;
    case 'boostAll': actions.backup(); for (const x of boostList()) giveBoost(x.id, 30); break;
    case 'boostStopAll': actions.backup(); for (const x of boostList()) stopBoost(x.id); break;
    // 🔫 武器
    case 'weaponGive': actions.backup(); giveWeapon(d.id); play('magic'); break;
    case 'weaponAll': actions.backup(); weaponIds().forEach(giveWeapon); play('magic'); break;
    case 'weaponTake': actions.backup(); takeWeapons([d.id]); break;
    case 'weaponNone': actions.backup(); takeWeapons(weaponIds()); break;
    // 🥚 蛋
    case 'egg': actions.backup(); giveHalloweenEgg(d.name, Number(d.v)); play('coin'); break;
    case 'eggAll': actions.backup(); for (const a of eggPets()) giveHalloweenEgg(a.name, 1); play('magic'); break;
    case 'eggClear': actions.backup(); state.hwEggs = []; save(); play('swoosh'); break;
    // 🧰 工具
    case 'hammer': actions.backup(); state.hasHammer = !state.hasHammer; save(); renderHotbar(); play('click'); break;
    case 'rod': {
      actions.backup();
      const now = Number.isInteger(state.rod) ? state.rod : 0;
      state.rod = d.v === 'max' ? FISHING_RODS.length - 1 : Math.max(0, Math.min(FISHING_RODS.length - 1, now + Number(d.v)));
      save();
      play('coin');
      break;
    }
    case 'vacuum': actions.backup(); state.vacuumLevel = Number(d.v); save(); actions.reloadNoIntro(); return; // 換吸塵機樣要重新載入
    // 🐾 每隻寵物一隻（呢個分類）
    case 'everyPet': actions.backup(); giveEveryPet(GROUPS.find((g) => g[0] === group)[2]()); break;
    // 🎨 皮膚
    case 'skinGive': actions.backup(); ownSkin(d.kind, d.id); play('magic'); break;
    case 'skinWear': actions.backup(); ownSkin(d.kind, d.id); wearSkin(d.kind, d.id); play('magic'); break;
    case 'skinLock': actions.backup(); lockSkin(d.kind, d.id); break;
    case 'skinAll': actions.backup(); (d.kind === 'ranger' ? RANGER_SKINS : PET_SKINS).forEach((s) => ownSkin(d.kind, s.id)); play('magic'); break;
    case 'skinReset-ranger': case 'skinReset-pet': {
      actions.backup();
      const kind = what.slice(10);
      (kind === 'ranger' ? RANGER_SKINS : PET_SKINS).forEach((s) => lockSkin(kind, s.id));
      break;
    }
    case 'bossSkin': {
      actions.backup();
      const bs = BOSS_SKINS.find((x) => x.id === d.id);
      state[bs.key] = !state[bs.key];
      if (!state[bs.key]) wearBossSkin(d.id, true); // 鎖返：着緊嗰啲 Boss 都除返
      save();
      play(state[bs.key] ? 'magic' : 'click');
      break;
    }
    case 'bossWear': {
      actions.backup();
      const bs = BOSS_SKINS.find((x) => x.id === d.id);
      if (bs && !state[bs.key]) state[bs.key] = true; // 未有就順手解鎖
      wearBossSkin(d.id);
      play('magic');
      break;
    }
  }
  rerender();
});

// ---------- 俾嘢小幫手 ----------
function stopBoost(id) {
  if (!state.boosts?.[id]) return;
  state.boosts = { ...state.boosts };
  delete state.boosts[id];
  save(); // 頭頂 chip 每半秒自己更新
}
function giveWeapon(id) {
  if (actions.giveWeapon) return actions.giveWeapon(id); // main.js 嘅 weapons.give（會更新快捷欄）
  if (!hasWeapon(id)) state.weapons = [...(state.weapons || []), id];
  save();
}
function takeWeapons(ids) {
  state.weapons = (state.weapons || []).filter((id) => !ids.includes(id));
  toolFlags.weapons = (toolFlags.weapons || []).filter((id) => !ids.includes(id)); // 戰鬥區入面：即刻喺快捷欄消失
  save();
  renderHotbar();
  play('swoosh');
}
function giveEveryPet(list) {
  for (const a of list) {
    const info = findAnimal(a.name) || a;
    state.pets.push({ name: info.name, biome: info.biome, kg: Math.max(0.1, Math.round(randomKg(info) * 10) / 10), rarity: info.rarity || pick.rarity, onPlot: false, ...(info.fuse ? { fuse: true } : {}) });
    if (!info.fuse && !state.indexFound.includes(info.name)) state.indexFound.push(info.name);
  }
  save();
  play('rescue');
  popup?.(`🎁 ${list.length} pets are in your backpack!`);
}
function ownSkin(kind, id) {
  const list = ownedList(kind);
  if (!list.includes(id)) list.push(id);
  save();
}
function wearSkin(kind, id) {
  if (kind === 'ranger') {
    state.rangerSkin = id;
    actions.wearRanger?.(RANGER_SKINS.find((s) => s.id === id));
  } else {
    state.petSkin = id;
    actions.refreshPets?.();
  }
  save();
}
function lockSkin(kind, id) {
  if (id === baseSkin(kind)) return;
  if (kind === 'ranger') state.ownedRanger = ownedList(kind).filter((x) => x !== id);
  else state.ownedPet = ownedList(kind).filter((x) => x !== id);
  if ((kind === 'ranger' ? state.rangerSkin : state.petSkin) === id) wearSkin(kind, baseSkin(kind)); // 着緊就換返基本款
  save();
}
// 所有生態區 Boss 換皮膚（id = 'normal' 除晒）；onlyOff = 淨係除咗着緊呢款嘅
function wearBossSkin(id, onlyOff = false) {
  const skins = (state.bossSkins ||= {});
  for (const b of actions.bosses?.() || []) {
    if (onlyOff) {
      if (skins[b.biome] !== id) continue;
      delete skins[b.biome];
      setBossSkin(b, 'normal');
      continue;
    }
    if (id === 'normal') delete skins[b.biome];
    else skins[b.biome] = id;
    setBossSkin(b, id);
  }
  save();
}

// 🔐 密碼表格：撳 UNLOCK 或者 Enter
$('panel-body').addEventListener('submit', (e) => {
  if (!e.target.matches?.('form[data-admin-gate]')) return;
  e.preventDefault();
  const input = $('admin-pass');
  if (checkPassword(input?.value || '')) {
    unlockAdmin();
    play('magic');
    const gate = e.target.closest('.admin-gate');
    gate?.classList.add('granted');
    $('admin-gate-msg').textContent = '✅ ACCESS GRANTED';
    setTimeout(rerender, 900); // 睇到「GRANTED」先開面板
    return;
  }

  play('wrong');
  const gate = e.target.closest('.admin-gate');
  gate.classList.remove('denied', 'shake');
  void gate.offsetWidth; // 重新播震動動畫
  gate.classList.add('denied', 'shake');
  $('admin-gate-msg').textContent = '⛔ ACCESS DENIED';
  input.value = '';
  input.focus();
});

$('panel-body').addEventListener('input', (e) => {
  if (!isOpen()) return;
  // 大細拉桿：拉嘅時候只更新數字同預覽（唔重畫，唔係會拉唔到）
  if (e.target.id === 'admin-size') {
    pick.size = Number(e.target.value);
    $('admin-size-num').textContent = `x${pick.size}`;
    $('admin-preview').textContent = previewText();
  }
  // 🔍 搜尋：淨係收埋／顯示卡（唔重畫，打字唔會甩）
  if (e.target.id === 'admin-search') {
    search = e.target.value;
    const q = search.trim().toLowerCase();
    let n = 0;
    for (const card of document.querySelectorAll('.admin-cards .card-animal')) {
      const show = !q || card.dataset.pet.includes(q);
      card.hidden = !show;
      if (show) n++;
    }
    $('admin-count').textContent = `${n} pets`;
    $('admin-none').hidden = n > 0;
  }
  if (e.target.id?.startsWith('admin-num-')) e.target.classList.remove('bad');
});
// 喺數字格撳 Enter = 撳 Set；喺面板打字唔好觸發遊戲快捷鍵（例如 E、P）
$('panel-body').addEventListener('keydown', (e) => {
  if (!isOpen() || e.target.tagName !== 'INPUT' || e.key === 'Escape') return;
  e.stopPropagation();
  if (e.key === 'Enter' && e.target.id.startsWith('admin-num-')) e.target.nextElementSibling?.click();
});
