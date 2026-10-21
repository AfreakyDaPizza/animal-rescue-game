// 畫面上嘅資料（HUD）：數值、夜晚倒數、位置、快捷欄、My Stats 同 Animal Index 面板

import { state, save } from './state.js';
import { short } from './format.js';
import { walkSpeed, jumpHeight } from './player.js';
import { formatTime, nextNightClock } from './daynight.js';
import { eventStatus } from './events.js';
import { todayQuests, questText } from './quests.js';
import { RANGER_SKINS, PET_SKINS } from './skins.js';
import { ANIMALS, HALLOWEEN_PETS, CHEST_PETS, animalsInBiome, kgOf, formatKg, itemMoney, findAnimal, mutationList, mutationText, mutationInfo, sizeText } from './data/animals.js';
import { HALLOWEEN_BIOMES } from './data/halloween.js'; // 🎃
import { BOSSES, rarityInfo, trainingGain, trainingGainLabel, INDEX_NEW_SPECIES_REWARD, INDEX_BIOME_COMPLETE_REWARD, FUSE_MONEY_BONUS, FIRE_MONEY, ECLIPSE_MONEY } from './data/balance.js';
import { BIOMES, BIOME_THEMES } from './world.js';
import { moneyPerSecond, TIERS, tierOf, sellPrice, getTierThumbnails, getMachineThumbnails } from './hub.js';
import { fuseChances } from './fuse.js';
import { petPic } from './animalPics.js'; // Index／寵物清單嘅動物相
import { adminHtml } from './adminPanel.js'; // 🔐 Secret Ranger Control Panel
import { rodShopHtml } from './rodShop.js'; // 🎣 Halloween 魚竿舖
import { gearInfo, gearStacks } from './data/gears.js'; // ⚙️ 背包 Gears（Issue #10）
import { plotSlots, plotMoneyMulti, MAX_TRAINING_LEVEL, MACHINE_LEVELS, LAB_LEGENDARY_NEEDED, LAB_PODS, LAB_PORTAL_BY_PODS, LAB_PORTAL_BY_LEGENDARY } from './data/balance.js';

const $ = (id) => document.getElementById(id);
const fmt = short; // K／M／B／T（src/format.js）
// 變異標籤（可以疊：🔥 FIRE x4 + 🌑 ECLIPSE x6）
export const mutationTags = (p) => mutationList(p).map((m) => (m === 'fire' ? `<small class="fire-tag">🔥 FIRE x${FIRE_MONEY}</small>` : m === 'eclipse' ? `<small class="fire-tag eclipse-tag">🌑 ECLIPSE x${ECLIPSE_MONEY}</small>` : `<small class="fire-tag ${m}-tag">${mutationInfo(m).emoji} ${mutationInfo(m).name} x${mutationInfo(m).money}</small>`)).join('');

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

// 數值變大就彈一彈（每次只係改字，唔會每格都重新排版）
const lastStat = {};
function bumpStat(id, value) {
  const el = $(id);
  const text = fmt(value);
  if (el.textContent !== text) el.textContent = text;
  if (lastStat[id] !== undefined && value > lastStat[id]) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  lastStat[id] = value;
}

export function updateHud(dayNight, location) {
  updateEventBanner();
  bumpStat('hud-money', state.money);
  bumpStat('hud-speed', state.speed);
  bumpStat('hud-iq', state.iq);
  $('hud-jump').textContent = fmt(state.jumpPower || 0); // 💪 Gym 彈床：有 Jump Power 先顯示
  $('hud-jump-box').hidden = !state.jumpPower;
  $('hud-tokens').textContent = fmt(state.tokens);
  $('hud-location').textContent = location;

  const timer = $('hud-timer');
  // 「(at …)」／「Biomes reset」包喺 span：窄畫面收埋（startstyle.css），唔好撞頂部掣
  const html = dayNight.isNight
    ? `🌙 Night!<span class="timer-extra"> Biomes reset ·</span> Day in ${formatTime(dayNight.timeLeft)}`
    : `☀️ Night in ${formatTime(dayNight.timeLeft)}<span class="timer-extra"> (at ${nextNightClock(dayNight)})</span>`;
  if (timer.dataset.html !== html) {
    timer.dataset.html = html;
    timer.innerHTML = html;
  }
  if (dayNight.isNight) {
    timer.classList.add('night');
  } else {
    timer.classList.remove('night');
    timer.classList.toggle('soon', dayNight.timeLeft <= 30); // 最後 30 秒變紅
  }
  renderHotbar();
}

// 彈出「+5 Speed」，飄上去然後消失
export function popup(text) {
  const el = document.createElement('div');
  // 唔同顏色：💰 錢 金色、⚡ Speed 藍、🧠 IQ 粉紅（加數就彈一彈）
  const kind = /\$/.test(text) ? 'money' : /speed/i.test(text) ? 'speed' : /\bIQ\b/.test(text) ? 'iq' : '';
  el.className = `popup${/^\+/.test(text) ? ' gain' : ''}${kind ? ` ${kind}` : ''}`;
  el.textContent = text;
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// 大字提示（例如入夜）
// 稀有動物：用稀有度顏色 + 閃光（見 style.css #announce.rare）
const RARE_WORDS = [['ETERNAL', '#18ffff'], ['MYTHIC', '#ff4081'], ['LEGENDARY', '#ffca28']];
export function announce(text) {
  const el = $('announce');
  el.textContent = text;
  const rare = RARE_WORDS.find(([w]) => text.toUpperCase().includes(w));
  el.classList.toggle('rare', !!rare);
  el.style.setProperty('--c', rare ? rare[1] : '#ffffff');
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
  const extra = { Laboratory: ['⚠️ Danger zone', '🔬 The Laboratory', '#b388ff'], 'Outside the Park': ['Outside the gate', 'Lab Road', '#76ff03'], Gym: ['Get faster · Get smarter', '💪 Ranger Gym', '#ff9100'],
    // 🎃 Halloween 世界（halloweenShape.js）
    '🎃 Spawn Ruins': ['🎃 Halloween World · Safe zone', '⭕ Spawn Ruins', '#b388ff'],
    'Pumpkin Graveyard': ['🎃 Halloween Biome 1', '🎃 Pumpkin Graveyard', '#ff9100'],
    'Hollow Sprites': ['🎃 Halloween Biome 2', '👻 Hollow Sprites', '#69f0ae'],
    'Abandoned Manor': ['🎃 Halloween Biome 3', '🏚️ Abandoned Manor', '#ea80fc'],
    'Egg Graveyard': ['Hatch your eggs here', '🪦 Egg Graveyard', '#9575cd'],
    'Train Station': ['All aboard...', '🚂 Phantom Express', '#76ff03'],
    'Fishing Lake': ['Fish for Halloween eggs', '🎣 Fishing Lake', '#4fc3f7'],
    'Ghost World': ['Catch the ghosts!', '👻 Ghost World', '#b388ff'] }[location];
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

// 鎚仔（Issue #2）：執咗就永遠喺第一格
export const HAMMER_ITEM = { kind: 'tool', item: { name: 'Hammer', tool: true } };
// 球棒（Issue #4）：Boss 戰 Phase 1、2 先有，喺第一格
export const BAT_ITEM = { kind: 'tool', item: { name: 'Bat', tool: true, bat: true } };
export const toolFlags = { bat: false };
// 🎒 背包（Issue #10）：可以由背包拖嘢落快捷欄（state.hotbar 記住每格放咗乜）
// 每樣嘢一個 key：寵物 'pet:uid'、救返嚟嘅動物 'res:uid'、Gear 'gear:type'（同種 Gear 疊埋一格）
// 冇拖過嘅格仔：好似以前咁，自動放救返嚟嘅動物同背包寵物
let uidN = 0;
export function uidOf(item) {
  if (!item.uid) item.uid = `${Date.now().toString(36)}${(uidN++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  return item.uid;
}
export const gearItem = (type, count) => ({ kind: 'gear', key: `gear:${type}`, item: { name: gearInfo(type).name, gear: type, count, rarity: gearInfo(type).rarity } });
// 背包入面可以放上快捷欄嘅嘢（地塊上面嘅寵物唔得：佢哋喺地塊做緊嘢）
export function hotbarPool() {
  return [
    ...state.borrowed.map((item) => ({ kind: 'rescued', key: `res:${uidOf(item)}`, item })),
    ...state.pets.filter((p) => !p.onPlot).map((item) => ({ kind: 'pet', key: `pet:${uidOf(item)}`, item })),
  ];
}
const toolItems = () => [
  ...(toolFlags.bat ? [BAT_ITEM] : []),
  ...(state.hasHammer && !state.labBossDefeated ? [HAMMER_ITEM] : []), // 實驗室冇咗：鎚仔冇用，唔再放快捷欄
];
export const hotbarToolCount = () => toolItems().length;
// 10 格（空格 = null）
export function hotbarItems() {
  const slots = Array(SLOTS).fill(null);
  const tools = toolItems();
  tools.forEach((t, i) => (slots[i] = t));
  const pool = hotbarPool();
  const byKey = new Map(pool.map((e) => [e.key, e]));
  for (const { type, count } of gearStacks()) byKey.set(`gear:${type}`, gearItem(type, count));
  const used = new Set();
  const pins = state.hotbar || [];
  for (let i = tools.length; i < SLOTS; i++) {
    const e = byKey.get(pins[i]);
    if (e && !used.has(e.key)) {
      slots[i] = e;
      used.add(e.key);
    }
  }
  const rest = pool.filter((e) => !used.has(e.key));
  for (let i = tools.length; i < SLOTS && rest.length; i++) if (!slots[i]) slots[i] = rest.shift();
  return slots;
}
// 將 key 放入第 i 格（原本有拖過嘢嘅格仔就同佢調位）
export function assignHotbar(i, key) {
  if (i < hotbarToolCount() || i >= SLOTS) return false;
  const items = hotbarItems();
  const hb = (state.hotbar = Array.from({ length: SLOTS }, (_, j) => state.hotbar?.[j] ?? null));
  const from = hb.indexOf(key);
  const fromShown = items.findIndex((e) => e?.key === key);
  const displaced = items[i]?.key;
  for (let j = 0; j < SLOTS; j++) if (hb[j] === key) hb[j] = null;
  if (displaced && displaced !== key && (from >= 0 || fromShown >= 0)) hb[from >= 0 ? from : fromShown] = displaced; // 調位
  else if (hb[i] && hb[i] !== key) hb[i] = null;
  hb[i] = key;
  save();
  renderHotbar();
  return true;
}
// 拎走第 i 格（Gear 會離開快捷欄；動物會自動排返入空格）
export function clearHotbar(i) {
  if (!state.hotbar) return;
  const key = hotbarItems()[i]?.key;
  state.hotbar = state.hotbar.map((k) => (k === key ? null : k));
  save();
  renderHotbar();
}
// 背包（inventory.js）可以攔住撳格仔（例如揀咗張卡，撳格仔 = 放落去）
export const hotbarHooks = { onSlotClick: null };

export function selectedHotbarItem() {
  return hotbarItems()[selected] || null;
}

export function selectSlot(i) {
  selected = (i + SLOTS) % SLOTS;
  renderHotbar();
}
export const scrollHotbar = (direction) => selectSlot(selected + direction);

const slotIcon = (it) => (it.kind === 'tool' ? (it.item.bat ? '🏏' : '🔨') : it.kind === 'gear' ? gearInfo(it.item.gear).emoji : findAnimal(it.item.name)?.emoji || '❓');
let lastHotbar = '';
export function renderHotbar() {
  const items = hotbarItems();
  const key = selected + JSON.stringify(items.map((x) => x && x.kind + x.item.name + (x.item.count || '') + (x.item.mutation || '')));
  if (key === lastHotbar) return;
  lastHotbar = key;

  const bar = $('hotbar');
  bar.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const it = items[i];
    const slot = document.createElement('div');
    slot.className = `slot ${it ? it.kind : ''} ${i === selected ? 'selected' : ''}`;
    slot.dataset.i = i;
    if (it && i !== selected) slot.style.borderColor = it.kind === 'tool' ? '#ffd600' : it.kind === 'gear' ? gearInfo(it.item.gear).color : rarityInfo(it.item.rarity).color; // 邊框顏色 = 稀有度
    slot.innerHTML = `<span class="num">${(i + 1) % 10}</span>${it ? slotIcon(it) : ''}${it?.kind === 'gear' && it.item.count > 1 ? `<span class="count">x${it.item.count}</span>` : ''}`;
    slot.addEventListener('click', () => {
      if (hotbarHooks.onSlotClick?.(i)) return;
      selectSlot(i);
    });
    bar.appendChild(slot);
  }
  const it = items[selected];
  $('hotbar-label').textContent = it?.item.bat
    ? '🏏 Bat - get close to the Scientist and press E or click to SMACK him!'
    : it?.kind === 'tool'
    ? '🔨 Hammer - smash the glass pods in the Laboratory to free the animals!'
    : it?.kind === 'gear'
    ? `${gearInfo(it.item.gear).emoji} ${it.item.name}${it.item.count > 1 ? ` x${it.item.count}` : ''} - press E or click to pick a pet to mutate!`
    : it
    ? `${it.item.flipped ? '🙃 ' : ''}${mutationList(it.item).length ? `${mutationText(it.item)} ` : ''}${it.item.rarity || 'Common'} ${it.item.name} · ${formatKg(kgOf(it.item))} · $${fmt(itemMoney(it.item))}/s - ${it.kind === 'rescued' ? 'put me in a Reproduce Machine!' : 'put me on your Plot!'}`
    : items.some(Boolean) ? '' : 'Rescued animals and pets go here · press ` for your Inventory';
}

// ================= 面板（My Stats／Animal Index） =================

// 其他檔案加嘅面板（🎃 Halloween：吸塵機舖、Halloween 雕像）：extraPanels[kind] = [標題, html(), 收埋掣]
export const extraPanels = {};
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
    fuse: ['🧪 Fuse Machine', fuseHtml, 'E'],
    quests: ['📜 Daily Quests', questsHtml, 'Q'],
    shop: ['🛍️ Skin Shop', shopHtml, 'E'],
    portal: ['🌀 The Portal', portalHtml, 'E'],
    admin: ['🔐 SECRET RANGER CONTROL PANEL', adminHtml, 'E'],
    ...extraPanels,
    rods: ['🎣 Skeleton Sam\'s Rod Shop', rodShopHtml, 'E'],
  };
  const [title, html, key] = panels[kind];
  $('panel-title').textContent = title;
  $('panel-body').innerHTML = html();
  $('panel-close-key').textContent = key;
  $('panel').dataset.kind = kind;
  $('panel').hidden = false;
}

$('panel-x').addEventListener('click', () => $('panel-close').click()); // 右上角 ✕ = Close

export function closePanel() {
  openPanelKind = null;
  delete $('panel').dataset.kind;
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
  const dev = (id, label) => `<button data-device="${id}" class="${state.device === id ? '' : 'grey'}">${label}${state.device === id ? ' ✔' : ''}</button>`;
  return `
    <h3>Stats</h3>
    <p class="device-switch">🎮 Playing on: ${dev('pc', '💻 PC')} ${dev('mobile', '📱 Mobile')}</p>
    <table>
      <tr><td>💰 Money</td><td>$${fmt(state.money)}</td></tr>
      <tr><td>💵 Plot earns</td><td>$${fmt(moneyPerSecond())} / sec</td></tr>
      <tr><td>⚡ Speed</td><td>${fmt(state.speed)}</td></tr>
      <tr><td>🏃 Walk speed</td><td>${walkSpeed(state.speed).toFixed(1)} steps/sec</td></tr>
      <tr><td>🧠 IQ</td><td>${fmt(state.iq)}</td></tr>
      <tr><td>🦘 Jump Power</td><td>${fmt(state.jumpPower || 0)} (jump ${jumpHeight().toFixed(1)} m high)</td></tr>
      <tr><td>🏋️ Treadmill</td><td>${level('treadmillLevel')} (+${trainingGainLabel(state.treadmillLevel, 'speed', fmt)}/sec)</td></tr>
      <tr><td>📚 Student Table</td><td>${level('tableLevel')} (+${trainingGainLabel(state.tableLevel, 'iq', fmt)}/sec)</td></tr>
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
      ${petPic(p.name, { rarity: p.rarity })}<b>${p.name}</b>
      <small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}${sizeText(p.sizeMul) ? ` · ${sizeText(p.sizeMul)}` : ''}${p.flipped ? ' · 🙃' : ''}</small>${mutationTags(p)}
      <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${p.where || (p.onPlot ? '🌿 On your Plot' : '🎒 In your backpack')}</p>${buttons}</div>`;
  };
  // 賺得最多排最前
  const pets = state.pets.map((p, i) => ({ p, i })).sort((a, b) => itemMoney(b.p) - itemMoney(a.p));
  return `<p class="index-summary">Plot: <b>${used}/${slots}</b> pets · earning <b>$${fmt(total)}/sec</b>${plotMoneyMulti(state.plotLevel) > 1 ? ` · 👑 Royal Kingdom x${plotMoneyMulti(state.plotLevel)}` : ''}</p>
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
        ${petPic(p.name, { rarity: p.rarity })}<b>${p.name}</b>
        <small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}${sizeText(p.sizeMul) ? ` · ${sizeText(p.sizeMul)}` : ''}${p.flipped ? ' · 🙃' : ''}</small>${mutationTags(p)}
        <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${p.onPlot ? '🌿 On your Plot' : '🎒 In your backpack'}</p>
        <div class="card-buttons"><button data-action="sell" data-i="${i}" class="sell">${confirmSell === i ? 'Sure? Sell!' : `Sell $${fmt(sellPrice(p))}`}</button></div></div>`;
    }).join('')}</div>`;
}

// Fuse Machine（Issue #4）：揀 3 隻 → 睇機會率 → FUSE
const fusePicked = new Set();
let confirmFuse = false;
function fuseHtml() {
  for (const p of [...fusePicked]) if (!state.pets.includes(p)) fusePicked.delete(p); // 賣咗／溶咗嘅
  if (state.pets.length < 3) return '<p class="index-summary">You need at least <b>3 pets</b> to fuse. Rescue more animals!</p>';
  const picked = [...fusePicked];
  const chances = fuseChances(picked);
  const pets = state.pets.map((p, i) => ({ p, i })).sort((a, b) => itemMoney(a.p) - itemMoney(b.p));
  const ready = picked.length === 3;
  const total = picked.reduce((n, p) => n + itemMoney(p), 0) / 3; // 3 隻嘅平均
  return `<p class="index-summary">Pick <b>3 pets</b> (${picked.length}/3). They will be <b>gone</b> and turn into ONE fuse-only pet! Rarer pets in = better chance.</p>
    <div class="fuse-chances">${chances.map((c) => {
      const r = rarityInfo(c.rarity);
      return `<div class="fuse-chance" style="border-color:${r.color}">${petPic(c.name, { rarity: c.rarity })}<b>${c.name}</b><small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}</small><span>${c.chance.toFixed(1)}%</span></div>`;
    }).join('')}</div>
    <div class="pet-actions">
      <button data-action="fuse-go" class="sell" ${ready ? '' : 'disabled'}>${!ready ? `Pick ${3 - picked.length} more` : confirmFuse ? 'Sure? FUSE them!' : `🧪 FUSE! (new pet earns $${fmt(total * Math.min(...Object.values(FUSE_MONEY_BONUS)))} to $${fmt(total * Math.max(...Object.values(FUSE_MONEY_BONUS)))}/s)`}</button>
      ${picked.length ? '<button data-action="fuse-clear" class="grey">Clear</button>' : ''}
    </div>
    <div class="cards">${pets.map(({ p, i }) => {
      const r = rarityInfo(p.rarity);
      const on = fusePicked.has(p);
      return `<div class="card-animal ${on ? 'equipped' : ''}" style="border-color:${r.color}">
        ${petPic(p.name, { rarity: p.rarity })}<b>${p.name}</b>
        <small style="color:${r.color === '#cfd8dc' ? '#78909c' : r.color}">${r.name}${sizeText(p.sizeMul) ? ` · ${sizeText(p.sizeMul)}` : ''}${p.flipped ? ' · 🙃' : ''}</small>${mutationTags(p)}
        <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${p.onPlot ? '🌿 On your Plot' : '🎒 In your backpack'}</p>
        <div class="card-buttons"><button data-action="fuse-pick" data-i="${i}" ${!on && picked.length >= 3 ? 'disabled' : ''}>${on ? '✔ Picked' : 'Pick'}</button></div></div>`;
    }).join('')}</div>`;
}

// 面板入面嘅掣（main.js 話俾我知撳咗要做乜）
let petActions = null;
export function setPetActions(actions) {
  petActions = actions;
}
// Stats 入面轉 Mobile／PC（小朋友：喺 Stats 都揀得）：存低再重新載入（唔再播開場）
document.getElementById('panel-body').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-device]');
  if (!b || b.dataset.device === state.device) return;
  state.device = b.dataset.device;
  save();
  try {
    sessionStorage.setItem('animal-rescue-skip-intro', '1');
  } catch {
    // 照載入
  }
  location.reload();
});
document.getElementById('panel-body').addEventListener('click', (e) => {
  const tabButton = e.target.closest('button[data-tab]');
  if (tabButton && openPanelKind === 'index') {
    indexTab = tabButton.dataset.tab;
    $('panel-body').innerHTML = indexHtml();
    return;
  }
  const button = e.target.closest('button[data-action]');
  if (!button || !petActions || !['pets', 'sell', 'fuse'].includes(openPanelKind)) return;
  const pet = state.pets[Number(button.dataset.i)];
  const action = button.dataset.action;
  if (openPanelKind === 'fuse') {
    if (action === 'fuse-pick') {
      if (fusePicked.has(pet)) fusePicked.delete(pet);
      else if (fusePicked.size < 3) fusePicked.add(pet);
      confirmFuse = false;
    } else if (action === 'fuse-clear') {
      fusePicked.clear();
      confirmFuse = false;
    } else if (action === 'fuse-go' && fusePicked.size === 3) {
      if (!confirmFuse) confirmFuse = true;
      else {
        confirmFuse = false;
        const picked = [...fusePicked];
        fusePicked.clear();
        petActions.fuse(picked);
        return;
      }
    }
    $('panel-body').innerHTML = fuseHtml();
    return;
  }
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
        <span class="kg">+${trainingGainLabel(t.minLevel, stat, fmt)} ${stat === 'speed' ? 'Speed' : 'IQ'}/sec at Lv ${t.minLevel}</span>
        ${current ? '<p class="you">⭐ You have this one!</p>' : ''}
      </div>`;
    }).join('')}</div>`;
}

function animalIndexHtml() {
  const found = ANIMALS.filter((a) => state.indexFound.includes(a.name)).length; // 🎃 Halloween 寵物另外計
  let html = `
    <div class="progress"><div style="width:${(found / ANIMALS.length) * 100}%"></div></div>
    <p class="index-summary"><b>${found} / ${ANIMALS.length}</b> species registered.
      Rescue a new species for a reward, and complete a whole biome for a big bonus!</p>`;
  BIOMES.forEach((biome, b) => {
    const animals = animalsInBiome(b);
    const got = animals.filter((a) => state.indexFound.includes(a.name)).length;
    const done = got === animals.length;
    html += `<h3>${biome.name} <span class="count">${got}/${animals.length}${done ? ' ✅' : ''}</span></h3>
      <p class="reward">New species: +$${fmt(INDEX_NEW_SPECIES_REWARD[b])} · Complete biome: +$${fmt(INDEX_BIOME_COMPLETE_REWARD[b])}</p>
      <div class="cards">`;
    for (const a of animals) {
      html += state.indexFound.includes(a.name)
        ? `<div class="card-animal">${petPic(a.name)}<b>${a.name}</b><small>${a.status}</small><span class="kg">⚖️ ${a.kg[0].toLocaleString('en-US')}–${a.kg[1].toLocaleString('en-US')} kg</span><p>${a.fact}</p></div>`
        : `<div class="card-animal locked">${petPic(a.name, { silhouette: true })}<b>???</b><small>Not rescued yet</small></div>`;
    }
    html += '</div>';
  });
  // 🎃 Halloween 寵物（由蛋孵出嚟）：自己一段
  html += `<h2 class="hw-index">🎃 Halloween Pets <span class="count">${HALLOWEEN_PETS.filter((a) => state.indexFound.includes(a.name)).length}/${HALLOWEEN_PETS.length}</span></h2>
    <p class="reward">Hatch them from eggs in the Halloween world!</p>`;
  for (const hb of HALLOWEEN_BIOMES) {
    const pets = HALLOWEEN_PETS.filter((a) => a.hw === hb.key);
    const got = pets.filter((a) => state.indexFound.includes(a.name)).length;
    html += `<h3>${hb.emoji} ${hb.name} <span class="count">${got}/${pets.length}${got === pets.length ? ' ✅' : ''}</span></h3><div class="cards">`;
    for (const a of pets) {
      html += state.indexFound.includes(a.name)
        ? `<div class="card-animal">${petPic(a.name, { rarity: a.rarity })}<b>${a.name}</b><small style="color:${rarityInfo(a.rarity).color}">${a.rarity}</small><span class="kg">⚖️ ${a.kg[0].toLocaleString('en-US')}–${a.kg[1].toLocaleString('en-US')} kg</span><p>${a.fact}</p></div>`
        : `<div class="card-animal locked">${petPic(a.name, { silhouette: true })}<b>???</b><small>Not hatched yet</small></div>`;
    }
    html += '</div>';
  }
  // 🐕 Echo 嘅 Zombified Chest 寵物（Issue #8）
  const chestGot = CHEST_PETS.filter((a) => state.indexFound.includes(a.name)).length;
  html += `<h3>🧟 Zombified Chest <span class="count">${chestGot}/${CHEST_PETS.length}${chestGot === CHEST_PETS.length ? ' ✅' : ''}</span></h3>
    <p class="reward">Buy a Zombified Chest from 🐕 Echo at the Spawn Ruins!</p><div class="cards">`;
  for (const a of CHEST_PETS) {
    html += state.indexFound.includes(a.name)
      ? `<div class="card-animal">${petPic(a.name, { rarity: a.rarity })}<b>${a.name}</b><small style="color:${rarityInfo(a.rarity).color}">${a.rarity}</small><span class="kg">⚖️ ${a.kg[0].toLocaleString('en-US')}–${a.kg[1].toLocaleString('en-US')} kg</span><p>${a.fact}</p></div>`
      : `<div class="card-animal locked">${petPic(a.name, { silhouette: true })}<b>???</b><small>Not found yet</small></div>`;
  }
  html += '</div>';
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
  lava: ['#2b1a14', '#ff5722', '#ffab00'], frost: ['#e1f5fe', '#81d4fa', '#ffffff'], electric: ['#1a237e', '#00b0ff', '#e1f5fe'], diamond: ['#e0f7fa', '#f8bbd0', '#b2ebf2', '#ffffff'],
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

// ================= Issue #2：實驗室傳送門面板 =================
// 兩個方法（做到其中一樣就開）：A 用鎚仔打爛晒玻璃艙；B 交 3 隻 Legendary（佢哋會由 Index 消失）
let portalActions = null;
let portalPicked = []; // 揀咗嘅 Legendary（'p3' = 寵物第 3 隻，'b1' = 等緊繁殖嘅第 1 隻）
let portalConfirm = false;
export function setPortalActions(actions) {
  portalActions = actions;
}
// 有邊啲 Legendary 可以交
export function legendaryChoices() {
  return [
    ...state.pets.map((item, i) => ({ key: `p${i}`, item, where: item.onPlot ? 'on your Plot' : 'pet' })),
    ...state.borrowed.map((item, i) => ({ key: `b${i}`, item, where: 'waiting to breed' })),
  ].filter((c) => c.item.rarity === 'Legendary');
}
function portalHtml() {
  const st = portalActions.status();
  if (st.ready) return `<p class="index-summary portal-open">🌀 The portal is <b>OPEN</b>!<br>Walk into it to enter the <b>BOSS ARENA</b> and fight the Mutated Scientist Poacher!</p>`;
  const choices = legendaryChoices();
  portalPicked = portalPicked.filter((k) => choices.some((c) => c.key === k));
  const need = LAB_LEGENDARY_NEEDED - st.legendary;
  let html = '<p class="index-summary">The portal is <b>LOCKED</b> 🔒. Open it with <b>ONE</b> of these:</p>';
  if (LAB_PORTAL_BY_PODS) {
    html += `<div class="portal-route"><h3>🔨 Route A: Smash the glass pods</h3>
      <p>Free the trapped animals with the Hammer: <b>${st.pods} / ${Math.min(LAB_PODS, st.podsTotal)}</b> ${st.pods >= st.podsTotal ? '✅' : ''}</p>
      ${state.hasHammer ? '' : '<p class="hint">You need the Hammer (found behind the mountain in Biome 6)</p>'}</div>`;
  }
  if (LAB_PORTAL_BY_PODS && LAB_PORTAL_BY_LEGENDARY) html += '<p class="portal-or">— OR —</p>';
  if (LAB_PORTAL_BY_LEGENDARY) {
    html += `<div class="portal-route"><h3>⭐ Route B: Give ${LAB_LEGENDARY_NEEDED} Legendary animals</h3>
      <p>Given: <b>${st.legendary} / ${LAB_LEGENDARY_NEEDED}</b>. ⚠️ They go into the portal and <b>leave your Index</b>!</p>`;
    if (!choices.length) html += '<p class="hint">You have no Legendary animals right now. Rescue some ★ Legendary animals first!</p>';
    else {
      html += `<p>Pick ${need} (${portalPicked.length} picked):</p><div class="cards">${choices.map((c) => {
        const a = findAnimal(c.item.name);
        const on = portalPicked.includes(c.key);
        return `<div class="card-animal ${on ? 'equipped' : ''}">${petPic(c.item.name, { rarity: 'Legendary' })}<b>${c.item.name}</b><small>★ Legendary · ${c.where}</small>
          <button data-portal="pick" data-key="${c.key}" class="${on ? 'grey' : ''}">${on ? 'Unpick' : 'Pick'}</button></div>`;
      }).join('')}</div>`;
      if (portalPicked.length >= need) {
        html += portalConfirm
          ? `<p class="hint">⚠️ Are you sure? These ${need} animals will be GONE and leave your Index!</p>
             <div class="pet-actions"><button data-portal="give" class="sell">Yes, give them to the portal</button><button data-portal="cancel" class="grey">Cancel</button></div>`
          : `<div class="pet-actions"><button data-portal="ask" class="sell">🌀 Give these ${need} to the portal</button></div>`;
      }
    }
    html += '</div>';
  }
  return html;
}
document.getElementById('panel-body').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-portal]');
  if (!b || openPanelKind !== 'portal' || !portalActions) return;
  const what = b.dataset.portal;
  const need = LAB_LEGENDARY_NEEDED - portalActions.status().legendary;
  if (what === 'pick') {
    const k = b.dataset.key;
    if (portalPicked.includes(k)) portalPicked = portalPicked.filter((x) => x !== k);
    else if (portalPicked.length < need) portalPicked.push(k);
    portalConfirm = false;
  }
  if (what === 'ask') portalConfirm = true;
  if (what === 'cancel') portalConfirm = false;
  if (what === 'give') {
    const picked = legendaryChoices().filter((c) => portalPicked.includes(c.key)).map((c) => c.item);
    portalPicked = [];
    portalConfirm = false;
    portalActions.give(picked);
  }
  $('panel-body').innerHTML = portalHtml();
});
