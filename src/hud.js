// 畫面上嘅資料（HUD）：數值、夜晚倒數、位置、快捷欄、My Stats 同 Animal Index 面板

import { state } from './state.js';
import { walkSpeed } from './player.js';
import { formatTime, nextNightClock } from './daynight.js';
import { eventStatus } from './events.js';
import { todayQuests, questText } from './quests.js';
import { RANGER_SKINS, PET_SKINS } from './skins.js';
import { ANIMALS, animalsInBiome, kgOf, formatKg, itemMoney } from './data/animals.js';
import { BOSSES, rarityInfo, trainingGain, INDEX_NEW_SPECIES_REWARD, INDEX_BIOME_COMPLETE_REWARD } from './data/balance.js';
import { BIOMES, BIOME_THEMES } from './world.js';
import { moneyPerSecond, TIERS, tierOf, sellPrice, getTierThumbnails, getMachineThumbnails } from './hub.js';
import { plotSlots, MAX_TRAINING_LEVEL, MACHINE_LEVELS, LAB_UNLOCK_PETS } from './data/balance.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const findAnimal = (name) => ANIMALS.find((a) => a.name === name);

// 畫面中間下面嘅提示（例如「[E] Borrow Giant Panda」），null 就收埋
export function setPrompt(html) {
  const el = $('hud-prompt');
  el.hidden = !html;
  if (html && el.innerHTML !== html) el.innerHTML = html;
}

// 頂部「抱住緊乜」嘅橫條
export function setCarrying(name) {
  const el = $('hud-carry');
  el.hidden = !name;
  if (name) el.textContent = `🐾 Carrying ${name} - bring it back to the Hub!`;
}

// 動物知識卡，顯示幾秒
let factTimer;
export function showFact(animal, extra = '') {
  const el = $('fact');
  el.innerHTML = `<b>${animal.name}</b> · ${animal.status}<br>💡 Did you know? ${animal.fact}${extra}`;
  el.hidden = false;
  clearTimeout(factTimer);
  factTimer = setTimeout(() => (el.hidden = true), 9000);
}

function updateEventBanner() {
  const s = eventStatus();
  const el = $('event-banner');
  if (s.active) {
    el.className = 'hud-box live';
    el.innerHTML = `<b>${s.ev.emoji} ${s.ev.name}! · ${formatTime(s.left)}</b><br>${s.ev.desc}`;
  } else {
    el.className = 'hud-box';
    el.textContent = `🎉 Next event in ${formatTime(s.next)}${s.nextAt ? ` (at ${s.nextAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : ''}`;
  }
}

export function updateHud(dayNight, location) {
  updateEventBanner();
  $('hud-money').textContent = fmt(state.money);
  $('hud-speed').textContent = fmt(state.speed);
  $('hud-iq').textContent = fmt(state.iq);
  $('hud-tokens').textContent = fmt(state.tokens);
  $('hud-location').textContent = location;

  const timer = $('hud-timer');
  if (dayNight.isNight) {
    timer.textContent = `🌙 Night! Biomes reset · Day in ${formatTime(dayNight.timeLeft)}`;
    timer.classList.add('night');
  } else {
    timer.textContent = `☀️ Night in ${formatTime(dayNight.timeLeft)} (at ${nextNightClock(dayNight)})`;
    timer.classList.remove('night');
    timer.classList.toggle('soon', dayNight.timeLeft <= 30); // 最後 30 秒變紅
  }
  renderHotbar();
}

// 彈出「+5 Speed」，飄上去然後消失
export function popup(text) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// 大字提示（例如入夜）
export function announce(text) {
  const el = $('announce');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth; // 重新開始動畫
  el.classList.add('show');
}

// 行入新地方：頂部彈大大個名（好似 Roblox 入新區）
let zoneTimer;
export function showZoneTitle(location) {
  const el = $('zone-title');
  const i = BIOMES.findIndex((b) => b.name === location);
  // Issue #2：大門外面
  const extra = { Laboratory: ['⚠️ Danger zone', '🔬 The Laboratory', '#b388ff'], 'Outside the Park': ['Outside the gate', 'Lab Road', '#76ff03'] }[location];
  el.querySelector('small').textContent = extra ? extra[0] : i >= 0 ? `Biome ${i + 1}` : 'Welcome back to';
  el.querySelector('span').textContent = extra ? extra[1] : i >= 0 ? BIOMES[i].short : 'The Hub';
  el.style.setProperty('--zone-color', extra ? extra[2] : i >= 0 ? BIOME_THEMES[i].top : '#ffd54f');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(zoneTimer);
  zoneTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// 右上角：Legendary／Mythic 動物喺邊（有箭咀指住方向）
let lastSightings = '';
export function setSightings(list, camera) {
  const el = $('sightings');
  const fx = -Math.sin(camera.rotation.y);
  const fz = -Math.cos(camera.rotation.y);
  const rows = list.map((w) => {
    const tx = w.group.position.x - camera.position.x;
    const tz = w.group.position.z - camera.position.z;
    const dist = Math.hypot(tx, tz);
    const angle = Math.atan2(fx * tz - fz * tx, fx * tx + fz * tz);
    const deg = Math.round((angle * 180) / Math.PI / 5) * 5;
    const color = w.rarity === 'Mythic' ? '#ff4081' : '#ffca28';
    return `<div class="sighting" style="--c:${color}"><span class="arrow" style="transform:rotate(${deg}deg)">⬆</span>
      <b>★ ${w.rarity}</b> ${w.animal.name}<small>Biome ${w.biome + 1} · ${Math.round(dist)} m</small></div>`;
  });
  const html = rows.join('');
  if (html !== lastSightings) {
    el.innerHTML = html;
    lastSightings = html;
  }
}

// ================= 快捷欄（Hotbar） =================
// 放住你救返嚟嘅動物（等繁殖機）同寵物（等放上地塊）。
// 1–9、0 或者滑鼠轆揀；揀咗嗰樣會拎喺手。

const SLOTS = 10;
let selected = 0;

export function hotbarItems() {
  return [
    ...state.borrowed.map((item) => ({ kind: 'rescued', item })),
    ...state.pets.filter((p) => !p.onPlot).map((item) => ({ kind: 'pet', item })),
  ].slice(0, SLOTS);
}

export function selectedHotbarItem() {
  return hotbarItems()[selected] || null;
}

export function selectSlot(i) {
  selected = (i + SLOTS) % SLOTS;
  renderHotbar();
}
export const scrollHotbar = (direction) => selectSlot(selected + direction);

let lastHotbar = '';
function renderHotbar() {
  const items = hotbarItems();
  const key = selected + JSON.stringify(items.map((x) => x.kind + x.item.name));
  if (key === lastHotbar) return;
  lastHotbar = key;

  const bar = $('hotbar');
  bar.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const it = items[i];
    const slot = document.createElement('div');
    slot.className = `slot ${it ? it.kind : ''} ${i === selected ? 'selected' : ''}`;
    if (it && i !== selected) slot.style.borderColor = rarityInfo(it.item.rarity).color; // 邊框顏色 = 稀有度
    slot.innerHTML = `<span class="num">${(i + 1) % 10}</span>${it ? findAnimal(it.item.name).emoji : ''}`;
    slot.addEventListener('click', () => selectSlot(i));
    bar.appendChild(slot);
  }
  const it = items[selected];
  $('hotbar-label').textContent = it
    ? `${it.item.rarity || 'Common'} ${it.item.name} · ${formatKg(kgOf(it.item))} · $${fmt(itemMoney(it.item))}/s - ${it.kind === 'rescued' ? 'put me in a Reproduce Machine!' : 'put me on your Plot!'}`
    : items.length ? '' : 'Rescued animals and pets go here';
}

// ================= 面板（My Stats／Animal Index） =================

let openPanelKind = null;
export const panelKind = () => openPanelKind;
export const isPanelOpen = () => openPanelKind !== null;

export function openPanel(kind) {
  openPanelKind = kind;
  const panels = {
    index: ['📖 Animal Index', indexHtml, 'I'],
    stats: ['📋 My Stats', statsHtml, 'P'],
    pets: ['🐾 My Pets', petsHtml, 'E'],
    sell: ['💰 Sell Stall', sellHtml, 'E'],
    quests: ['📜 Daily Quests', questsHtml, 'Q'],
    shop: ['🛍️ Skin Shop', shopHtml, 'E'],
  };
  const [title, html, key] = panels[kind];
  $('panel-title').textContent = title;
  $('panel-body').innerHTML = html();
  $('panel-close-key').textContent = key;
  $('panel').hidden = false;
}

export function closePanel() {
  openPanelKind = null;
  $('panel').hidden = true;
}

function statsHtml() {
  const list = (items, empty, fn) => (items.length ? items.map(fn).join('') : `<li class="empty">${empty}</li>`);
  const machines = state.machines.map((m, i) => {
    if (!m) return `<li>Machine ${i + 1}: empty</li>`;
    const left = Math.max(0, Math.ceil((m.endsAt - Date.now()) / 1000));
    return `<li>Machine ${i + 1}: ${m.name}${m.second ? ` + ${m.second.name}` : ''} - ${left ? `${left}s left` : 'READY!'}</li>`;
  }).join('');
  const level = (key) => `Lv ${state[key]} · ${TIERS[tierOf(state[key])].name}`;
  return `
    <h3>Stats</h3>
    <table>
      <tr><td>💰 Money</td><td>$${fmt(state.money)}</td></tr>
      <tr><td>💵 Plot earns</td><td>$${fmt(moneyPerSecond())} / sec</td></tr>
      <tr><td>⚡ Speed</td><td>${fmt(state.speed)}</td></tr>
      <tr><td>🏃 Walk speed</td><td>${walkSpeed(state.speed).toFixed(1)} steps/sec</td></tr>
      <tr><td>🧠 IQ</td><td>${fmt(state.iq)}</td></tr>
      <tr><td>🏋️ Treadmill</td><td>${level('treadmillLevel')} (+${fmt(trainingGain(state.treadmillLevel, 'speed'))}/sec)</td></tr>
      <tr><td>📚 Student Table</td><td>${level('tableLevel')} (+${fmt(trainingGain(state.tableLevel))}/sec)</td></tr>
    </table>
    <h3>Pets (${state.pets.length})</h3>
    <ul>${list(state.pets, 'No pets yet - rescue an animal from a biome!', (p) =>
      `<li>${findAnimal(p.name).emoji} <b style="color:${rarityInfo(p.rarity).color}">${p.rarity || 'Common'}</b> ${p.name} (${formatKg(kgOf(p))}) - ${p.onPlot ? `on Plot, $${fmt(itemMoney(p))}/sec` : `waiting to go on your Plot ($${fmt(itemMoney(p))}/sec)`}</li>`)}</ul>
    <h3>Rescued, waiting for a machine (${state.borrowed.length})</h3>
    <ul>${list(state.borrowed, 'None.', (a) => `<li>${findAnimal(a.name).emoji} ${a.name} (${formatKg(kgOf(a))})</li>`)}</ul>
    <h3>Reproduce Machines</h3>
    <ul>${machines}</ul>
    <h3>Bosses</h3>
    <table>${BOSSES.map((b, i) => `<tr><td>Biome ${i + 1}: ${b.name}</td><td>${fmt(b.speed)} Speed · ${fmt(b.iq)} IQ</td></tr>`).join('')}</table>
    <h3>Progress</h3>
    <table>
      <tr><td>🐾 Animals rescued</td><td>${state.rescued}</td></tr>
      <tr><td>📖 Animal Index</td><td>${state.indexFound.length} / ${ANIMALS.length}</td></tr>
    </table>`;
}

// 所有寵物：卡仔（emoji、稀有度、重量、每秒賺幾多、喺邊）+ 落地塊／收返／賣 嘅掣
let confirmSell = -1; // 撳過一次「Sell」嘅寵物（要撳多次先真係賣）
function petsHtml() {
  const used = state.pets.filter((p) => p.onPlot).length;
  const slots = plotSlots(state.plotLevel);
  const total = moneyPerSecond();
  const waiting = [
    ...state.machines.filter(Boolean).map((m) => ({ ...m, where: '💗 In a Reproduce Machine' })),
    ...state.borrowed.map((a) => ({ ...a, where: '🎒 Rescued - needs a Reproduce Machine' })),
  ];
  if (!state.pets.length && !waiting.length) return '<p class="index-summary">No pets yet! Rescue an animal from a biome to get started.</p>';
  const card = (p, buttons = '') => {
    const r = rarityInfo(p.rarity);
    return `<div class="card-animal ${p.onPlot ? 'equipped' : ''}" style="border-color:${r.color}">
      <div class="emoji">${findAnimal(p.name).emoji}</div><b>${p.name}</b>
      <small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}${p.sizeMul ? ` · 🔥 GIANT x${p.sizeMul}` : ''}</small>
      <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${p.where || (p.onPlot ? '🌿 On your Plot' : '🎒 In your backpack')}</p>${buttons}</div>`;
  };
  // 賺得最多排最前
  const pets = state.pets.map((p, i) => ({ p, i })).sort((a, b) => itemMoney(b.p) - itemMoney(a.p));
  return `<p class="index-summary">Plot: <b>${used}/${slots}</b> pets · earning <b>$${fmt(total)}/sec</b></p>
    <div class="pet-actions">
      <button data-action="best">⭐ Equip Best</button>
      <button data-action="unequip-all" class="grey">Unequip All</button>
    </div>
    <div class="cards">${pets.map(({ p, i }) => card(p, `<div class="card-buttons">
        ${p.onPlot ? `<button data-action="unequip" data-i="${i}" class="grey">Unequip</button>`
          : `<button data-action="equip" data-i="${i}" ${used >= slots ? 'disabled title="Plot is full"' : ''}>Equip</button>`}
        <button data-action="sell" data-i="${i}" class="sell">${confirmSell === i ? 'Sure? Sell!' : `Sell $${fmt(sellPrice(p))}`}</button>
      </div>`)).join('')}
      ${waiting.map((p) => card(p)).join('')}</div>`;
}

// 賣寵物攤位：最平嘅排最前（通常想賣啲細嘅），地塊上面嘅都賣得
let confirmSellBackpack = false;
function sellHtml() {
  if (!state.pets.length) return '<p class="index-summary">You have no pets to sell yet!</p>';
  const backpack = state.pets.filter((p) => !p.onPlot);
  const backpackTotal = backpack.reduce((n, p) => n + sellPrice(p), 0);
  const pets = state.pets.map((p, i) => ({ p, i })).sort((a, b) => sellPrice(a.p) - sellPrice(b.p));
  return `<p class="index-summary">Sell pets you don't need for 💰 cash. You have <b>$${fmt(state.money)}</b>.</p>
    <div class="pet-actions">
      ${backpack.length ? `<button data-action="sell-backpack" class="sell">${confirmSellBackpack ? 'Sure? Sell them all!' : `Sell all ${backpack.length} backpack pets for $${fmt(backpackTotal)}`}</button>` : '<small>All your pets are on your Plot.</small>'}
    </div>
    <div class="cards">${pets.map(({ p, i }) => {
      const r = rarityInfo(p.rarity);
      return `<div class="card-animal ${p.onPlot ? 'equipped' : ''}" style="border-color:${r.color}">
        <div class="emoji">${findAnimal(p.name).emoji}</div><b>${p.name}</b>
        <small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}${p.sizeMul ? ` · 🔥 GIANT x${p.sizeMul}` : ''}</small>
        <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${p.onPlot ? '🌿 On your Plot' : '🎒 In your backpack'}</p>
        <div class="card-buttons"><button data-action="sell" data-i="${i}" class="sell">${confirmSell === i ? 'Sure? Sell!' : `Sell $${fmt(sellPrice(p))}`}</button></div></div>`;
    }).join('')}</div>`;
}

// 面板入面嘅掣（main.js 話俾我知撳咗要做乜）
let petActions = null;
export function setPetActions(actions) {
  petActions = actions;
}
document.getElementById('panel-body').addEventListener('click', (e) => {
  const tabButton = e.target.closest('button[data-tab]');
  if (tabButton && openPanelKind === 'index') {
    indexTab = tabButton.dataset.tab;
    $('panel-body').innerHTML = indexHtml();
    return;
  }
  const button = e.target.closest('button[data-action]');
  if (!button || !petActions || (openPanelKind !== 'pets' && openPanelKind !== 'sell')) return;
  const pet = state.pets[Number(button.dataset.i)];
  const action = button.dataset.action;
  if (action === 'sell-backpack') {
    if (!confirmSellBackpack) confirmSellBackpack = true;
    else {
      confirmSellBackpack = false;
      petActions.sellMany(state.pets.filter((p) => !p.onPlot));
    }
  } else if (action === 'sell') {
    confirmSellBackpack = false;
    if (confirmSell !== Number(button.dataset.i)) confirmSell = Number(button.dataset.i);
    else {
      confirmSell = -1;
      petActions.sell(pet);
    }
  } else {
    confirmSell = -1;
    if (action === 'best') petActions.best();
    if (action === 'unequip-all') petActions.unequipAll();
    if (action === 'equip') petActions.equip(pet);
    if (action === 'unequip') petActions.unequip(pet);
  }
  $('panel-body').innerHTML = openPanelKind === 'sell' ? sellHtml() : petsHtml(); // 即刻更新
});

// Index 面板有三個分頁：動物、跑步機、學生桌
let indexTab = 'animals';
function indexHtml() {
  const tab = (id, label) => `<button data-tab="${id}" class="${indexTab === id ? 'active' : ''}">${label}</button>`;
  const tabs = `<div class="tabs">${tab('animals', '🐾 Animals')}${tab('treadmill', '🏃 Treadmills')}${tab('table', '📚 Student Tables')}${tab('machines', '💗 Machines')}</div>`;
  if (indexTab === 'machines') return tabs + machineIndexHtml();
  return tabs + (indexTab === 'animals' ? animalIndexHtml() : tierIndexHtml(indexTab));
}

// 繁殖機嘅 3 個等級
function machineIndexHtml() {
  const pics = getMachineThumbnails();
  const level = state.machineLevel;
  return `<p class="index-summary"><b>${level} / ${MACHINE_LEVELS.length}</b> machine upgrades unlocked · 🌙 Machines are 10x faster at night!</p>
    <div class="cards tiers">${MACHINE_LEVELS.map((lv, i) => {
      const got = level >= i + 1;
      const current = level === i + 1;
      const faster = lv.timeFactor < 1 ? `${Math.round((1 - lv.timeFactor) * 100)}% faster` : 'Normal speed';
      return `<div class="card-animal tier ${got ? '' : 'locked'} ${current ? 'current' : ''}">
        <img src="${pics[i]}" alt="${lv.name}">
        <b>${got ? lv.name : '???'}</b>
        <small>${got ? `Level ${i + 1}` : `🔒 $${fmt(lv.cost)} to unlock`}</small>
        <span class="kg">⏱️ ${faster}${lv.double ? '<br>👯 2 pets at once · 🔥 20% GIANT (1-10x)' : ''}</span>
        ${current ? '<p class="you">⭐ You have this one!</p>' : ''}
      </div>`;
    }).join('')}</div>`;
}

// 跑步機／學生桌嘅所有款式（解鎖咗有彩色，未解鎖灰色加鎖）
function tierIndexHtml(kind) {
  const key = kind === 'treadmill' ? 'treadmillLevel' : 'tableLevel';
  const stat = kind === 'treadmill' ? 'speed' : 'iq';
  const level = state[key];
  const pics = getTierThumbnails(kind);
  const unlocked = TIERS.filter((t) => level >= t.minLevel).length;
  return `<p class="index-summary"><b>${unlocked} / ${TIERS.length}</b> designs unlocked · Level ${level} / ${MAX_TRAINING_LEVEL}</p>
    <div class="cards tiers">${TIERS.map((t, i) => {
      const got = level >= t.minLevel;
      const current = tierOf(level) === i;
      return `<div class="card-animal tier ${got ? '' : 'locked'} ${current ? 'current' : ''}">
        <img src="${pics[i]}" alt="${t.name}">
        <b>${got ? t.name : '???'}</b>
        <small>${got ? `Level ${t.minLevel}+` : `🔒 Unlock at Level ${t.minLevel}`}</small>
        <span class="kg">+${fmt(trainingGain(t.minLevel, stat))} ${stat === 'speed' ? 'Speed' : 'IQ'}/sec at Lv ${t.minLevel}</span>
        ${current ? '<p class="you">⭐ You have this one!</p>' : ''}
      </div>`;
    }).join('')}</div>`;
}

function animalIndexHtml() {
  const found = state.indexFound.length;
  let html = `
    <div class="progress"><div style="width:${(found / ANIMALS.length) * 100}%"></div></div>
    <p class="index-summary"><b>${found} / ${ANIMALS.length}</b> species registered.
      Rescue a new species for a reward, and complete a whole biome for a big bonus!</p>
    <p class="index-summary">${found >= LAB_UNLOCK_PETS ? '🔓 The gate at the bottom of the Hub is open! 🔬 Go to the Laboratory!' : `🔒 Find <b>${LAB_UNLOCK_PETS - found}</b> more to open the gate at the bottom of the Hub (${found} / ${LAB_UNLOCK_PETS})`}</p>`;
  BIOMES.forEach((biome, b) => {
    const animals = animalsInBiome(b);
    const got = animals.filter((a) => state.indexFound.includes(a.name)).length;
    const done = got === animals.length;
    html += `<h3>${biome.name} <span class="count">${got}/${animals.length}${done ? ' ✅' : ''}</span></h3>
      <p class="reward">New species: +$${fmt(INDEX_NEW_SPECIES_REWARD[b])} · Complete biome: +$${fmt(INDEX_BIOME_COMPLETE_REWARD[b])}</p>
      <div class="cards">`;
    for (const a of animals) {
      html += state.indexFound.includes(a.name)
        ? `<div class="card-animal"><div class="emoji">${a.emoji}</div><b>${a.name}</b><small>${a.status}</small><span class="kg">⚖️ ${a.kg[0].toLocaleString('en-US')}–${a.kg[1].toLocaleString('en-US')} kg</span><p>${a.fact}</p></div>`
        : '<div class="card-animal locked"><div class="emoji">❓</div><b>???</b><small>Not rescued yet</small></div>';
    }
    html += '</div>';
  });
  return html;
}

// ================= 每日任務面板 =================
function questsHtml() {
  const qs = todayQuests();
  return `<p class="index-summary">New quests every day! You have <b>🎟️ ${fmt(state.tokens)}</b> Skin Tokens.<br>
      Also earn tokens for every pet you get (rarer = more!).</p>
    <div class="quest-list">${qs.map((q, i) => {
      const pct = Math.round((q.progress / q.n) * 100);
      const done = q.progress >= q.n;
      return `<div class="quest ${q.claimed ? 'claimed' : ''}">
        <div class="quest-top"><b>${questText(q)}</b><span>🎟️ ${q.reward}</span></div>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <small>${fmt(q.progress)} / ${fmt(q.n)}</small>
        ${q.claimed ? '<span class="tag">✔ Claimed</span>' : done ? `<button data-shop="claim" data-i="${i}">Claim 🎟️ ${q.reward}</button>` : ''}
      </div>`;
    }).join('')}</div>`;
}

// ================= 皮膚商店面板 =================
let shopTab = 'ranger';
const swatch = (colors) => `<div class="swatch" style="background:linear-gradient(135deg, ${colors.join(', ')})"></div>`;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const PET_SWATCH = {
  none: ['#a5d6a7', '#8d6e63'], shadow: ['#1a1a24', '#4527a0'], golden: ['#fff59d', '#ffa000'],
  neon: ['#ff4081', '#18ffff'], galaxy: ['#1a0640', '#7c4dff', '#0b2a6b'], rainbow: ['#ff1744', '#ffea00', '#00e676', '#2979ff', '#d500f9'],
};
function shopHtml() {
  const tab = (id, label) => `<button data-shop-tab="${id}" class="${shopTab === id ? 'active' : ''}">${label}</button>`;
  let html = `<div class="tabs">${tab('ranger', '🧑 Ranger Skins')}${tab('pet', '🐾 Pet Skins')}</div>
    <p class="index-summary">You have <b>🎟️ ${fmt(state.tokens)}</b> Skin Tokens. Get more from 📜 Quests (Q) and new pets!</p>`;
  const card = (preview, name, cost, owned, equipped, action, i, extra = '') => `<div class="card-animal ${equipped ? 'equipped' : ''}">
      ${preview}<b>${name}</b>${extra}
      ${equipped ? '<span class="tag">✔ Wearing</span>'
        : owned ? `<button data-shop="${action}-equip" data-i="${i}">Equip</button>`
        : `<button data-shop="${action}-buy" data-i="${i}" ${state.tokens < cost ? 'disabled' : ''}>Buy 🎟️ ${cost}</button>`}
    </div>`;
  if (shopTab === 'ranger') {
    html += `<div class="cards">${RANGER_SKINS.map((s, i) => card(swatch([hex(s.hat), hex(s.shirt), hex(s.pants)]), s.name, s.cost,
      state.ownedRanger.includes(s.id), state.rangerSkin === s.id, 'ranger', i)).join('')}</div>`;
  } else {
    html += `<p class="reward">A pet skin changes the look of ALL your pets.</p><div class="cards">${PET_SKINS.map((s, i) => card(swatch(PET_SWATCH[s.id]), s.name, s.cost,
      state.ownedPet.includes(s.id), state.petSkin === s.id, 'pet', i)).join('')}</div>`;
  }
  return html;
}

// 商店／任務嘅掣（main.js 話俾我知撳咗要做乜）
let shopActions = null;
export function setShopActions(actions) {
  shopActions = actions;
}
document.getElementById('panel-body').addEventListener('click', (e) => {
  const tabBtn = e.target.closest('button[data-shop-tab]');
  if (tabBtn && openPanelKind === 'shop') {
    shopTab = tabBtn.dataset.shopTab;
    $('panel-body').innerHTML = shopHtml();
    return;
  }
  const btn = e.target.closest('button[data-shop]');
  if (!btn || !shopActions) return;
  shopActions.handle(btn.dataset.shop, Number(btn.dataset.i));
  $('panel-body').innerHTML = openPanelKind === 'quests' ? questsHtml() : shopHtml();
});
