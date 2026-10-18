// 🔐 Secret Ranger Control Panel（小朋友 2026-10-18）：秘密沙灘嗰粒掣（同以前橋下面個紅掣合埋做一粒）
// 好似管理員面板：提早開新嘢、攞任何寵物、成本 Index、Max 晒、開活動、喺生態區出指定稀有度
// 第一次改嘢之前會備份真存檔（SAVE_KEY + '-backup'），可以一撳還原
import { state } from './state.js';
import { short } from './format.js';
import { ANIMALS, FUSE_PETS, MUTATIONS, mutationInfo, joinMutations, sizeText } from './data/animals.js';
import { RARITIES, NEW_BIOME_DATE, FUSE_OPEN_DATE, GYM_OPEN_DATE } from './data/balance.js';
import { BIOMES } from './data/biomeList.js';
import { EVENTS } from './events.js';
import { petPic } from './animalPics.js';

const $ = (id) => document.getElementById(id);
const fmt = short; // K／M／B／T（src/format.js）
let actions = null;
let tab = 'future';
let confirm = null; // 撳兩下先做：例如 'index'、'max'
const pick = { name: ANIMALS[0].name, rarity: 'Mythic', size: 1, mutations: [], flipped: false };
let spawnBiome = 0;
let spawnRarity = 'Mythic';

export function setAdminActions(a) {
  actions = a;
}

const isOpen = () => $('panel').dataset.kind === 'admin';
const dateText = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

const TABS = [
  ['future', '🔮 Future'],
  ['pets', '🐾 Pets'],
  ['index', '📖 Index'],
  ['max', '⚡ Max'],
  ['events', '🎉 Events'],
  ['safety', '💾 Safety'],
];

function confirmButton(id, label, extra = '') {
  return confirm === id
    ? `<button data-admin="${id}" ${extra} class="sell">Sure? Yes, do it!</button> <button data-admin="cancel" class="grey">Cancel</button>`
    : `<button data-admin="ask" data-what="${id}" ${extra}>${label}</button>`;
}

// 🔮 所有有日期嘅新嘢：加一個新更新（例如 Halloween）就喺度加一行，再喺 main.js 嘅 unlockAll 開埋佢
// open：到咗日期未；early：提早開咗未
const FUTURE = [
  { emoji: '🧪', name: 'Fuse Machine', date: FUSE_OPEN_DATE, open: (s) => s.fuseDate, early: () => state.bigButton },
  { emoji: '👑', name: 'Enchanted Kingdom', date: NEW_BIOME_DATE, open: (s) => s.kingdomDate, early: () => state.bigButton },
  { emoji: '💪', name: 'Ranger Gym', date: GYM_OPEN_DATE, open: (s) => s.gymDate, early: () => state.gymEarly && actions.status().gymPresent },
];

function futureHtml() {
  const s = actions.status();
  const row = (f) => `<tr><td>${f.emoji} <b>${f.name}</b></td><td>${dateText(f.date)}</td><td>${f.open(s) ? '✅ Open' : f.early() ? '🔓 Unlocked early' : '🔒 Coming soon'}</td></tr>`;
  const allDone = FUTURE.every((f) => f.open(s) || f.early());
  return `<p class="index-summary">See what's coming and unlock it <b>early</b>.</p>
    <table>${FUTURE.map(row).join('')}</table>
    <div class="pet-actions">${allDone ? '<button class="grey" data-admin="noop">✔ Everything is unlocked!</button>' : s.gymPresent ? '<button data-admin="unlockAll" class="sell big-unlock">🚀 Unlock ALL future updates</button>' : confirmButton('unlockAll', '🚀 Unlock ALL future updates (skips the Lab boss!)', 'class="big-unlock"')}</div>
    <div class="pet-actions">
      <button data-admin="unlock" ${state.bigButton ? 'class="grey"' : ''}>${state.bigButton ? '✔ Fuse + Kingdom unlocked' : '🔓 Unlock Fuse Machine + Enchanted Kingdom'}</button>
      <button data-admin="gym" class="${state.gymEarly ? 'grey' : ''}">${state.gymEarly ? '✔ Gym open early (tap to close)' : '💪 Open the Gym early'}</button>
      ${s.gymPresent ? '<button data-admin="gotoGym">🏃 Take me to the Gym</button>' : confirmButton('gotoGym', '🏃 Take me to the Gym (skips the Lab boss!)')}
    </div>
    ${s.gymPresent ? '' : '<p class="hint">The Gym is where the Lab is. Going there now skips the Mutated Scientist Poacher fight, and the Lab will be gone.</p>'}`;
}

const findRarity = () => [...ANIMALS, ...FUSE_PETS].find((a) => a.name === pick.name)?.rarity || pick.rarity;
// 預覽：例如「🙃 GIANT x10 🔥🌑 Mythic Celestial Sunlion」
const previewText = () => {
  const muts = MUTATIONS.filter((m) => pick.mutations.includes(m)).map((m) => mutationInfo(m).emoji).join('');
  return [pick.flipped ? '🙃' : '', sizeText(pick.size), muts, findRarity(), pick.name].filter(Boolean).join(' ');
};
const niceName = (m) => mutationInfo(m).name[0] + mutationInfo(m).name.slice(1).toLowerCase();

function petsHtml() {
  const all = [...ANIMALS, ...FUSE_PETS];
  const opt = (v, cur, label = v) => `<button data-admin="${v === cur ? 'noop' : 'set'}" data-k="__K__" data-v="${v}" class="${v === cur ? '' : 'grey'}">${label}</button>`;
  const choose = (k, vals, cur, labels) => vals.map((v, i) => opt(v, cur, labels?.[i]).replace('__K__', k)).join('');
  return `<p class="index-summary">Pick any pet and add it to your backpack.</p>
    <p><b>Picked:</b> ${pick.name}</p>
    <div class="pet-actions">${choose('rarity', RARITIES.map((r) => r.name), pick.rarity)}</div>
    <div class="pet-actions admin-size"><b>📏 Size</b>
      <input type="range" id="admin-size" min="0.25" max="10" step="0.25" value="${pick.size}">
      <span id="admin-size-num">x${pick.size}</span>
      ${[0.5, 1, 3, 10].map((v) => `<button data-admin="size" data-v="${v}" class="${v === pick.size ? '' : 'grey'}">x${v}</button>`).join('')}</div>
    <div class="pet-actions"><b>✨ Mutations</b> ${MUTATIONS.map((m) => `<button data-admin="mut" data-v="${m}" class="${pick.mutations.includes(m) ? '' : 'grey'}">${pick.mutations.includes(m) ? '✔ ' : ''}${mutationInfo(m).emoji} ${niceName(m)}</button>`).join('')}
      <small class="hint">Tap both to stack them!</small></div>
    <div class="pet-actions"><button data-admin="flip" class="${pick.flipped ? '' : 'grey'}">${pick.flipped ? '✔ 🙃 Upside down' : '🙃 Upside down'}</button></div>
    <p class="admin-preview">You'll get: <b id="admin-preview">${previewText()}</b></p>
    <div class="pet-actions"><button data-admin="give" class="sell">🎁 Give me this pet</button></div>
    <div class="cards">${all.map((a) => `<div class="card-animal ${a.name === pick.name ? 'equipped' : ''}">${petPic(a.name, { rarity: a.rarity || pick.rarity })}<b>${a.name}</b>
      <button data-admin="pick" data-name="${a.name}" class="${a.name === pick.name ? '' : 'grey'}">${a.name === pick.name ? '✔ Picked' : 'Pick'}</button></div>`).join('')}</div>`;
}

function indexHtml() {
  const total = ANIMALS.length;
  return `<p class="index-summary">Your Index has <b>${state.indexFound.filter((n) => ANIMALS.some((a) => a.name === n)).length} / ${total}</b> species.</p>
    <div class="pet-actions">${confirmButton('index', '📖 Fill in the whole Index')}</div>
    <p class="hint">This marks every animal as found (no rescue rewards).</p>`;
}

function maxHtml() {
  return `<p class="index-summary">Make everything the best it can be.</p>
    <div class="pet-actions">${confirmButton('max', '⚡ MAX all upgrades (treadmill, table, machines, plot)')}</div>
    <div class="pet-actions">${confirmButton('rich', '💰 Huge money, Speed, IQ and Jump Power')}</div>
    <p class="hint">Now: $${fmt(state.money)} · ⚡ ${fmt(state.speed)} · 🧠 ${fmt(state.iq)} · 🦘 ${fmt(state.jumpPower || 0)}. The game reloads after MAX so everything looks right.</p>`;
}

function eventsHtml() {
  const biomes = BIOMES.map((b, i) => [i, b.name]);
  return `<p class="index-summary">Start any event right now.</p>
    <div class="pet-actions">${EVENTS.map((e) => `<button data-admin="event" data-id="${e.id}">${e.emoji} ${e.name}</button>`).join('')}</div>
    <div class="pet-actions"><button data-admin="crazy" class="sell">🤪 CRAZY PET FRENZY</button></div>
    <h3>Spawn an animal</h3>
    <div class="pet-actions">${biomes.map(([i, n]) => `<button data-admin="biome" data-i="${i}" class="${i === spawnBiome ? '' : 'grey'}">${i + 1}. ${n.replace(/^Biome \d+ - /, '')}</button>`).join('')}</div>
    <div class="pet-actions">${RARITIES.map((r) => `<button data-admin="srarity" data-v="${r.name}" class="${r.name === spawnRarity ? '' : 'grey'}">${r.name}</button>`).join('')}</div>
    <div class="pet-actions"><button data-admin="spawn" class="sell">✨ Spawn it</button></div>
    <p class="hint">Eternal animals only live in the Enchanted Kingdom (biome 7).</p>`;
}

function safetyHtml() {
  const has = actions.hasBackup();
  return `<p class="index-summary">Before your first change here, the game saved a copy of your <b>real</b> save.</p>
    ${has ? `<div class="pet-actions">${confirmButton('restore', '💾 Restore my real save')}</div>` : '<p class="hint">No changes yet, so there is nothing to restore.</p>'}`;
}

export function adminHtml() {
  if (!actions) return '';
  const body = { future: futureHtml, pets: petsHtml, index: indexHtml, max: maxHtml, events: eventsHtml, safety: safetyHtml }[tab]();
  return `<div class="tabs admin-tabs">${TABS.map(([id, label]) => `<button data-admin="tab" data-tab-id="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('')}</div>${body}`;
}

const rerender = () => isOpen() && ($('panel-body').innerHTML = adminHtml());

$('panel-body').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-admin]');
  if (!b || !isOpen() || !actions) return;
  const what = b.dataset.admin;
  const d = b.dataset;
  if (what === 'noop') return;
  if (what !== 'ask' && what !== 'cancel') confirm = null;
  switch (what) {
    case 'tab': tab = d.tabId; break;
    case 'ask': confirm = d.what; break;
    case 'cancel': break;
    case 'unlock': actions.backup(); actions.unlockEarly(); return; // 會播開門動畫、收埋面板
    case 'gym': actions.backup(); actions.gymEarly(!state.gymEarly); break;
    case 'gotoGym': actions.backup(); actions.gotoGym(); return; // 可能會重新載入
    case 'pick': pick.name = d.name; break;
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
    case 'biome': spawnBiome = Number(d.i); break;
    case 'srarity': spawnRarity = d.v; break;
    case 'spawn': actions.spawn(spawnBiome, spawnRarity); return;
    case 'restore': actions.restore(); return;
  }
  rerender();
});

// 大細拉桿：拉嘅時候只更新數字同預覽（唔重畫，唔係會拉唔到）
$('panel-body').addEventListener('input', (e) => {
  if (e.target.id !== 'admin-size' || !isOpen()) return;
  pick.size = Number(e.target.value);
  $('admin-size-num').textContent = `x${pick.size}`;
  $('admin-preview').textContent = previewText();
});
