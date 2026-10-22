// 🔐 Secret Ranger Control Panel（小朋友 2026-10-18）：秘密沙灘嗰粒掣（同以前橋下面個紅掣合埋做一粒）
// 好似管理員面板：提早開新嘢、攞任何寵物、成本 Index、Max 晒、開活動、喺生態區出指定稀有度
// Issue #10（小朋友 2026-10-21）：可以俾 🌽 Candy Corn、💎 Meteor Crystals 等等貨幣；面板整靚啲：
//   分頁清楚啲、寵物搜尋、快速掣（+100／+1K／+1M／MAX）、所有活動（直接讀 events.js 個 EVENTS）、傳送、測試開關
// 🎒 Gears 分頁（小朋友 2026-10-22）：俾任何 Shard（每粒有自己個樣，src/gearArt.js）、寶箱、Boost；清走所有 Gear
//   全部直接讀 GEARS（data/gears.js）：其他檔案加新 gear type 就自動出現
// 第一次改嘢之前會備份真存檔（SAVE_KEY + '-backup'），可以一撳還原
import { state, save, SAVE_KEY, autoBackups, restoreAutoBackup } from './state.js';
import { short } from './format.js';
import { play } from './sound.js';
import { ANIMALS, FUSE_PETS, HALLOWEEN_PETS, CHEST_PETS, METEOR_PETS, DEMONIC_PETS, MUTATIONS, mutationInfo, joinMutations, sizeText } from './data/animals.js';
import { RARITIES, NEW_BIOME_DATE, FUSE_OPEN_DATE, GYM_OPEN_DATE, HALLOWEEN_OPEN_DATE, METEOR_OPEN_DATE } from './data/balance.js';
import { BIOMES } from './data/biomeList.js';
import { EVENTS } from './events.js';
import { petPic } from './animalPics.js';
import { GEARS, gearInfo, gearCount, addGear, takeGear, isShardGear, syncShardCount } from './data/gears.js';
import { gearPic } from './gearArt.js';
import { giveReward } from './demonicRewards.js'; // 🧙 Witch Tower 獎品（Issue #11）

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
const BOOST_MINUTES = [5, 30];
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
    ${section('💎 Mutation Shards', `<div class="cards admin-cards admin-gear-cards">${shards.map(gearCard).join('')}</div>
      <div class="pet-actions"><button data-admin="allShards" class="sell">🎁 Give me 1 of every shard</button></div>`, 'Use a shard on a pet in your Inventory to give it that mutation!')}
    ${section('🧰 Chests and more', others.length ? `<div class="cards admin-cards admin-gear-cards">${others.map(gearCard).join('')}</div>` : '<p class="hint">No chests yet. New gears show up here by themselves!</p>')}
    ${boosts.length ? section('⏱️ Boosts', boosts.map((b) => `<div class="admin-cur"><div class="admin-cur-name"><span class="admin-cur-emoji">${b.emoji}</span><b>${b.name}</b></div>
      <div class="admin-cur-btns">${BOOST_MINUTES.map((m) => `<button data-admin="boost" data-id="${b.id}" data-v="${m}">+${m} min</button>`).join('')}</div></div>`).join('')) : ''}
    ${section('🧙 Witch Tower prizes', `<div class="pet-actions admin-wrap">
      <button data-admin="tower" data-type="lavaBloomEgg">🌋 +1 Lava Bloom Egg</button>
      <button data-admin="tower" data-type="pumpkgrimEgg">🎃 +1 Pumpkgrim Egg</button>
      <button data-admin="tower" data-type="demonicSkin" class="${state.ownedRanger?.includes('demonic') ? 'grey' : ''}">${state.ownedRanger?.includes('demonic') ? '✔ ' : ''}😈 Demonic Ranger skin</button>
      <button data-admin="tower" data-type="demonicBossSkin" class="${state.demonicBossSkin ? 'grey' : ''}">${state.demonicBossSkin ? '✔ ' : ''}😈 Demonic Boss skin</button>
    </div>`, 'Eggs hatch at the 🪦 Egg Graveyard. Demonic Chests and the Demonic Shard are in the lists above.')}
    ${section('🗑️ Clear', `<div class="pet-actions">${confirmButton('clearGears', '🗑️ Remove ALL my gears')}</div>`)}`;
}

// ---------- 🔓 Unlocks + 測試開關 ----------
// 🔮 所有有日期嘅新嘢：加一個新更新（例如 Halloween）就喺度加一行，再喺 main.js 嘅 unlockAll 開埋佢
// open：到咗日期未；early：提早開咗未
const ECHO_QUESTS_DATE = '2026-10-24';
const FUTURE = [
  { emoji: '🧪', name: 'Fuse Machine', date: FUSE_OPEN_DATE, open: (s) => s.fuseDate, early: () => state.bigButton },
  { emoji: '👑', name: 'Enchanted Kingdom', date: NEW_BIOME_DATE, open: (s) => s.kingdomDate, early: () => state.bigButton },
  { emoji: '💪', name: 'Ranger Gym', date: GYM_OPEN_DATE, open: (s) => s.gymDate, early: () => state.gymEarly && actions.status().gymPresent },
  { emoji: '🎃', name: 'Halloween World', date: HALLOWEEN_OPEN_DATE, open: (s) => s.halloweenDate, early: () => state.halloweenEarly },
  { emoji: '☄️', name: 'Meteoric Shop + Event', date: METEOR_OPEN_DATE, open: (s) => s.meteorDate, early: () => state.meteorEarly },
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
      <button data-admin="unlock" ${state.bigButton ? 'class="grey"' : ''}>${state.bigButton ? '✔ Fuse + Kingdom unlocked' : '🔓 Unlock Fuse Machine + Enchanted Kingdom'}</button>
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
      <p class="hint" id="admin-none" ${list.some(matches) ? 'hidden' : ''}>No pets match. Try another word!</p>`)}`;
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
    ${section('🌗 Day and night', `<div class="pet-actions admin-wrap"><button data-admin="night">🌙 Make it night now</button><button data-admin="day">☀️ Make it day now</button></div>`)}`;
}

// ---------- 🎉 Events ----------
function eventsHtml() {
  const biomes = BIOMES.map((b, i) => [i, b.name]);
  return `${section('🎉 Start an event', `<div class="admin-grid">${EVENTS.map((e) => `<button data-admin="event" data-id="${e.id}" title="${(e.desc || '').replace(/"/g, '&quot;')}">${e.emoji} ${e.name}</button>`).join('')}</div>
    <div class="admin-grid"><button data-admin="crazy" class="sell">🤪 CRAZY PET FRENZY</button><button data-admin="train">🚂 Phantom Express now</button></div>`, 'Each event runs for its normal time, then the clock events come back.')}
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
  const body = { give: giveHtml, future: futureHtml, pets: petsHtml, gears: gearsHtml, world: worldHtml, max: maxHtml, events: eventsHtml, safety: safetyHtml }[tab]();
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
  if (!b || !isOpen() || !actions) return;
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
  }
  rerender();
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
