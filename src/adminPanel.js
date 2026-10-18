// 🔐 Secret Ranger Control Panel（小朋友 2026-10-18）：秘密沙灘嗰粒掣（同以前橋下面個紅掣合埋做一粒）
// 好似管理員面板：提早開新嘢、攞任何寵物、成本 Index、Max 晒、開活動、喺生態區出指定稀有度
// 第一次改嘢之前會備份真存檔（SAVE_KEY + '-backup'），可以一撳還原
import { state } from './state.js';
import { ANIMALS, FUSE_PETS } from './data/animals.js';
import { RARITIES, NEW_BIOME_DATE, FUSE_OPEN_DATE, GYM_OPEN_DATE } from './data/balance.js';
import { BIOMES } from './data/biomeList.js';
import { EVENTS } from './events.js';
import { petPic } from './animalPics.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
let actions = null;
let tab = 'future';
let confirm = null; // 撳兩下先做：例如 'index'、'max'
const pick = { name: ANIMALS[0].name, rarity: 'Mythic', giant: false, mutation: '' };
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

function futureHtml() {
  const s = actions.status();
  const row = (emoji, name, iso, open, early) => `<tr><td>${emoji} <b>${name}</b></td><td>${dateText(iso)}</td><td>${open ? '✅ Open' : early ? '🔓 Unlocked early' : '🔒 Coming soon'}</td></tr>`;
  return `<p class="index-summary">See what's coming and unlock it <b>early</b>.</p>
    <table>
      ${row('🧪', 'Fuse Machine', FUSE_OPEN_DATE, s.fuseDate, state.bigButton)}
      ${row('👑', 'Enchanted Kingdom', NEW_BIOME_DATE, s.kingdomDate, state.bigButton)}
      ${row('💪', 'Ranger Gym', GYM_OPEN_DATE, s.gymDate, state.gymEarly)}
    </table>
    <div class="pet-actions">
      <button data-admin="unlock" ${state.bigButton ? 'class="grey"' : ''}>${state.bigButton ? '✔ Fuse + Kingdom unlocked' : '🔓 Unlock Fuse Machine + Enchanted Kingdom'}</button>
      <button data-admin="gym" class="${state.gymEarly ? 'grey' : ''}">${state.gymEarly ? '✔ Gym open early (tap to close)' : '💪 Open the Gym early'}</button>
      ${s.gymPresent ? '<button data-admin="gotoGym">🏃 Take me to the Gym</button>' : confirmButton('gotoGym', '🏃 Take me to the Gym (skips the Lab boss!)')}
    </div>
    ${s.gymPresent ? '' : '<p class="hint">The Gym is where the Lab is. Going there now skips the Mutated Scientist Poacher fight, and the Lab will be gone.</p>'}`;
}

function petsHtml() {
  const all = [...ANIMALS, ...FUSE_PETS];
  const opt = (v, cur, label = v) => `<button data-admin="${v === cur ? 'noop' : 'set'}" data-k="__K__" data-v="${v}" class="${v === cur ? '' : 'grey'}">${label}</button>`;
  const choose = (k, vals, cur, labels) => vals.map((v, i) => opt(v, cur, labels?.[i]).replace('__K__', k)).join('');
  return `<p class="index-summary">Pick any pet and add it to your backpack.</p>
    <p><b>Picked:</b> ${pick.name}</p>
    <div class="pet-actions">${choose('rarity', RARITIES.map((r) => r.name), pick.rarity)}</div>
    <div class="pet-actions">${choose('giant', ['0', '1'], pick.giant ? '1' : '0', ['Normal size', '🦣 GIANT x3'])}</div>
    <div class="pet-actions">${choose('mutation', ['', 'fire', 'eclipse'], pick.mutation, ['No mutation', '🔥 Fire', '🌑 Eclipse'])}</div>
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
    case 'set':
      if (d.k === 'giant') pick.giant = d.v === '1';
      else pick[d.k] = d.v;
      break;
    case 'give': actions.backup(); actions.givePet({ name: pick.name, rarity: pick.rarity, sizeMul: pick.giant ? 3 : null, mutation: pick.mutation || null }); break;
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
