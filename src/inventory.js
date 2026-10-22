// 🎒 背包 Inventory（小朋友 Issue #10）：撳 ` 掣（或者 🎒 掣）開
// 三個分頁：
//   🐉 Animals：魔法／Halloween／寶箱／Fuse 寵物（唔係真嘅動物）
//   🐼 Endangered Animals：真嘅動物（src/data/animals.js ANIMALS 入面、唔係 magical）——救返嚟等繁殖機嘅 + 呢啲品種嘅寵物
//   ⚙️ Gears：道具（src/data/gears.js），例如 🔮 Halloween Shard、☄️ Meteoric Shard、🧰 寶箱（chests.js：撳 Open／快捷欄撳 E 開箱）
// 電腦：用滑鼠拖張卡落下面快捷欄（1–0）；手機：撳張卡，再撳一格
// 用 Shard：揀咗佢（Gears 分頁撳 Use，或者快捷欄揀咗撳 E）→ 跳去 Animals 分頁「揀一隻寵物變異」→ 撳寵物 → 變！

import { state, save } from './state.js';
import { short as fmt } from './format.js';
import { ANIMALS, findAnimal, kgOf, formatKg, itemMoney, sizeText, mutationInfo, applyMutation } from './data/animals.js';
import { rarityInfo } from './data/balance.js';
import { GEARS, gearInfo, gearStacks, takeGear, isChestGear } from './data/gears.js';
import { extraPanels, panelKind, mutationTags, hotbarItems, hotbarToolCount, assignHotbar, clearHotbar, hotbarHooks, uidOf, popup, announce, selectSlot } from './hud.js';
import { petPic } from './animalPics.js';
import { gearPic, gearIcon } from './gearArt.js'; // 💎 Shard 圖示

const $ = (id) => document.getElementById(id);

// 分類規則：品種喺 ANIMALS（真動物 list）而且唔係 magical（Enchanted Kingdom 嗰啲）= Endangered；其他 = Animals
export function isEndangered(item) {
  const a = findAnimal(item.name);
  return !!a && ANIMALS.includes(a) && !a.magical;
}

let tab = 'animals';
let mutateWith = null; // 用緊邊種 Gear（揀寵物變異模式）
let picked = null; // 手機：撳咗邊張卡（再撳一格快捷欄就放落去）
let burst = null; // 啱啱變異咗嘅寵物（卡仔閃一閃）：{ pet, color }
let win = null; // 啱啱變異完：面板頂嘅大字（announce 俾面板遮住）
let ctx = null;

const rarityColor = (r) => (r.color === '#cfd8dc' ? '#78909c' : r.color);

// 背包入面每樣嘢：{ kind, key, item, onPlot }
function petEntries(endangered) {
  const list = [
    ...(endangered ? state.borrowed.map((item) => ({ kind: 'rescued', key: `res:${uidOf(item)}`, item })) : []),
    ...state.pets.filter((p) => isEndangered(p) === endangered).map((item) => ({ kind: 'pet', key: `pet:${uidOf(item)}`, item, onPlot: !!item.onPlot })),
  ];
  return list.sort((a, b) => itemMoney(b.item) - itemMoney(a.item));
}

function slotOf(key) {
  const i = hotbarItems().findIndex((e) => e?.key === key);
  return i < 0 ? null : (i + 1) % 10;
}

function sparks(color) {
  return `<div class="inv-sparks">${Array.from({ length: 14 }, (_, i) => `<span style="--a:${(i / 14) * 360}deg;--c:${color}">✦</span>`).join('')}</div>`;
}

function animalCard(e) {
  const p = e.item;
  const r = rarityInfo(p.rarity);
  const slot = slotOf(e.key);
  const g = mutateWith && gearInfo(mutateWith);
  const canMutate = g && e.kind === 'pet' && g.canUse(p);
  const draggable = !mutateWith && !e.onPlot;
  const where = e.kind === 'rescued' ? '🎒 Rescued - needs a Reproduce Machine' : e.onPlot ? '🌿 On your Plot' : '🎒 In your backpack';
  const cls = ['card-animal', 'inv-card', e.onPlot ? 'equipped' : '', draggable ? 'inv-drag' : '', picked === e.key ? 'inv-picked' : '', g ? (canMutate ? 'inv-can-mutate' : 'inv-no-mutate') : '', burst?.pet === p ? 'inv-burst' : ''].join(' ');
  return `<div class="${cls}" data-key="${e.key}" style="border-color:${r.color}">
    ${burst?.pet === p ? sparks(burst.color) : ''}
    ${slot !== null ? `<span class="inv-slot-num" title="In hotbar slot ${slot}">${slot}</span>` : ''}
    ${petPic(p.name, { rarity: p.rarity })}<b>${p.flipped ? '🙃 ' : ''}${p.name}</b>
    <small style="color:${rarityColor(r)}">${r.name}${sizeText(p.sizeMul) ? ` · ${sizeText(p.sizeMul)}` : ''}</small>${mutationTags(p)}
    <span class="kg">⚖️ ${formatKg(kgOf(p))} · 💰 $${fmt(itemMoney(p))}/s</span><p>${where}</p>
    ${g ? `<div class="card-buttons"><button data-inv="mutate" ${canMutate ? '' : 'disabled'}>${canMutate ? `${gearInfo(mutateWith).emoji} Mutate!` : e.kind === 'pet' ? 'Already has it' : 'Not a pet yet'}</button></div>` : ''}
  </div>`;
}

function gearCard({ type, count }) {
  const g = gearInfo(type);
  const key = `gear:${type}`;
  const slot = slotOf(key);
  return `<div class="card-animal inv-card inv-drag inv-gear ${picked === key ? 'inv-picked' : ''}" data-key="${key}" style="border-color:${g.color}">
    ${slot !== null ? `<span class="inv-slot-num">${slot}</span>` : ''}
    ${gearPic(type)}<b>${g.name}</b>
    <small style="color:${g.color}">${g.rarity} Gear · x${count}</small>
    <p>${g.desc()}</p><p class="inv-where">${g.where || ''}</p>
    <div class="card-buttons"><button data-inv="use" data-type="${type}">${g.chest ? '🧰 Open' : '✨ Use'}</button></div>
  </div>`;
}

function inventoryHtml() {
  const animals = petEntries(false);
  const endangered = petEntries(true);
  const stacks = gearStacks();
  if (mutateWith && tab === 'gears') tab = 'animals';
  const tabBtn = (id, label, n) => `<button data-inv-tab="${id}" class="${tab === id ? 'active' : ''}">${label} (${n})</button>`;
  const tabs = `<div class="tabs">${tabBtn('animals', '🐉 Animals', animals.length)}${tabBtn('endangered', '🐼 Endangered Animals', endangered.length)}${mutateWith ? '' : tabBtn('gears', '⚙️ Gears', stacks.reduce((n, s) => n + s.count, 0))}</div>`;
  const g = mutateWith && gearInfo(mutateWith);
  const pickedName = picked && (picked.startsWith('gear:') ? gearInfo(picked.slice(5)).name : [...animals, ...endangered].find((e) => e.key === picked)?.item.name);
  const hint = win
    ? `<div class="inv-banner inv-win" style="border-color:${win.color};--c:${win.color}">${win.text}</div>`
    : g
    ? `<div class="inv-banner inv-mutate-banner" style="border-color:${g.color}">${gearIcon(mutateWith, 'inv-banner-icon')} <b>Using a ${g.name}!</b> Pick a pet to mutate. <button data-inv="cancel" class="grey">Cancel</button></div>`
    : pickedName
    ? `<div class="inv-banner">👉 Now tap a hotbar slot below to put <b>${pickedName}</b> there!</div>`
    : '<p class="hint inv-hint">🖱️ Drag a card onto the hotbar (1-0) below · 📱 Tap a card, then tap a slot · drag a slot back up here to take it off</p>';
  let body;
  if (tab === 'gears') {
    body = stacks.length ? `<div class="cards">${stacks.map(gearCard).join('')}</div>`
      : `<p class="index-summary">No gears yet! Trade Soul Dust at the 🗿 Statue of Halloween for a 🔮 Halloween Shard.</p>`;
  } else {
    const list = tab === 'animals' ? animals : endangered;
    body = list.length ? `<div class="cards">${list.map(animalCard).join('')}</div>`
      : `<p class="index-summary">${tab === 'animals' ? 'No magical, Halloween or Fuse pets yet! Find them in the Enchanted Kingdom, the Halloween World or the Fuse Machine.' : 'No endangered animals yet! Rescue one from a biome.'}</p>`;
  }
  return tabs + hint + body;
}
extraPanels.inventory = ['🎒 Inventory', inventoryHtml, '`'];

const isOpen = () => panelKind() === 'inventory';
function rerender() {
  if (isOpen()) $('panel-body').innerHTML = inventoryHtml();
}

// 變異一隻寵物（其他檔案都用得：Meteoric Chest 之類）：改資料 + 存檔 + 地塊模型更新（手上嗰隻會自己換）
export function mutatePet(pet, id, opts) {
  applyMutation(pet, id, opts);
  save();
  if (pet.onPlot) ctx?.refreshPlot();
  return pet;
}

function findByKey(key) {
  if (key.startsWith('pet:')) return state.pets.find((p) => p.uid === key.slice(4));
  if (key.startsWith('res:')) return state.borrowed.find((p) => p.uid === key.slice(4));
  return null;
}

function doMutate(pet) {
  const type = mutateWith;
  const g = gearInfo(type);
  if (!g.canUse(pet)) return;
  const kind = g.mutate(pet);
  if (!kind || !takeGear(type)) return;
  mutateWith = null;
  save();
  // 🔮 Halloween Shard + 地塊上面嘅寵物：播傳送門動畫（好似 Steal an Egg）
  if (g.portal && pet.onPlot && ctx.portalMutate?.(pet, kind)) return;
  mutatePet(pet, kind);
  const info = mutationInfo(kind);
  ctx.play('shard');
  setTimeout(() => ctx.play('magic'), 350);
  burst = { pet, color: info.color };
  win = { text: `${info.emoji} ${pet.name} became <b>${info.name}</b>! (x${info.money} money)`, color: info.color };
  tab = isEndangered(pet) ? 'endangered' : 'animals';
  rerender();
  setTimeout(() => {
    burst = null;
    rerender();
  }, 2200);
  setTimeout(() => {
    win = null;
    rerender();
  }, 4000);
  announce(`${info.emoji} ${pet.name} became ${info.name}! (x${info.money} money)`);
}

// 開背包：gearType = 用緊嘅 Gear（直接入「揀寵物」模式）
function open(gearType = null) {
  mutateWith = gearType && GEARS[gearType] ? gearType : null;
  picked = null;
  win = null;
  if (mutateWith) tab = petEntries(false).some((e) => e.kind === 'pet') || !petEntries(true).some((e) => e.kind === 'pet') ? 'animals' : 'endangered'; // 冇魔法寵物：直接去 Endangered 分頁
  if (!isOpen()) ctx.togglePanel('inventory');
  else rerender();
}

export function createInventory(opts) {
  ctx = opts;
  const body = $('panel-body');

  body.addEventListener('click', (e) => {
    if (!isOpen() || justDragged) return;
    const t = e.target.closest('button[data-inv-tab]');
    if (t) {
      tab = t.dataset.invTab;
      picked = null;
      ctx.play('click');
      return rerender();
    }
    const b = e.target.closest('button[data-inv]');
    if (b?.dataset.inv === 'cancel') {
      mutateWith = null;
      return rerender();
    }
    if (b?.dataset.inv === 'use') return useGear(b.dataset.type);
    const card = e.target.closest('.inv-card');
    if (!card) return;
    if (mutateWith) {
      if (card.classList.contains('inv-can-mutate')) {
        const pet = findByKey(card.dataset.key);
        if (pet) doMutate(pet);
      }
      return;
    }
    if (!card.classList.contains('inv-drag')) return popup('🌿 This pet is on your Plot. Unequip it first to put it in your hotbar!');
    picked = picked === card.dataset.key ? null : card.dataset.key; // 手機：撳卡 → 再撳一格
    ctx.play('click');
    rerender();
  });

  // 撳快捷欄一格：有揀咗卡就放落去
  hotbarHooks.onSlotClick = (i) => {
    if (!isOpen() || justDragged) return !!justDragged;
    if (!picked) return false;
    if (i < hotbarToolCount()) return popup('🔨 That slot holds your tool!'), true;
    assignHotbar(i, picked);
    picked = null;
    ctx.play('click');
    rerender();
    return true;
  };

  // ---- 滑鼠拖拉 ----
  let drag = null;
  let justDragged = false;
  const ghost = document.createElement('div');
  ghost.id = 'inv-ghost';
  ghost.hidden = true;
  document.body.appendChild(ghost);
  const slotAt = (x, y) => document.elementFromPoint(x, y)?.closest('#hotbar .slot');
  window.addEventListener('pointerdown', (e) => {
    if (!isOpen() || e.button !== 0 || e.pointerType === 'touch' || mutateWith) return;
    const card = e.target.closest('#panel-body .inv-drag');
    const slot = e.target.closest('#hotbar .slot');
    if ((card && !e.target.closest('button')) || slot) e.preventDefault(); // 唔好揀字
    if (card && !e.target.closest('button')) drag = { key: card.dataset.key, x: e.clientX, y: e.clientY, icon: card.querySelector('.inv-gear-emoji, img, .emoji')?.outerHTML || '❔' };
    else if (slot) {
      const it = hotbarItems()[Number(slot.dataset.i)];
      if (it && it.kind !== 'tool') drag = { key: it.key, from: Number(slot.dataset.i), x: e.clientX, y: e.clientY, icon: slot.innerHTML.replace(/<span class="(num|count)">.*?<\/span>/g, '') };
    }
  });
  // 唔好俾瀏覽器自己拖張相（會搶咗我哋嘅拖拉）
  window.addEventListener('dragstart', (e) => {
    if (isOpen() && e.target.closest?.('#panel-body, #hotbar')) e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    if (!drag.on) {
      drag.on = true;
      ghost.innerHTML = drag.icon;
      ghost.hidden = false;
      document.body.classList.add('inv-dragging');
    }
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    const s = slotAt(e.clientX, e.clientY);
    document.querySelectorAll('#hotbar .slot.drop-hover').forEach((x) => x !== s && x.classList.remove('drop-hover'));
    s?.classList.add('drop-hover');
  });
  window.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (!d?.on) return;
    ghost.hidden = true;
    document.body.classList.remove('inv-dragging');
    document.querySelectorAll('#hotbar .slot.drop-hover').forEach((x) => x.classList.remove('drop-hover'));
    justDragged = true;
    setTimeout(() => (justDragged = false), 0); // 拖完放手嗰下嘅 click 唔算
    const s = slotAt(e.clientX, e.clientY);
    if (s) {
      const i = Number(s.dataset.i);
      if (i < hotbarToolCount()) return popup('🔨 That slot holds your tool!');
      if (assignHotbar(i, d.key)) ctx.play('click');
    } else if (d.from != null && document.elementFromPoint(e.clientX, e.clientY)?.closest('#panel')) {
      clearHotbar(d.from); // 由快捷欄拖返上背包 = 拎走
      ctx.play('swoosh');
    }
    picked = null;
    rerender();
  });

  // fromHotbar = 快捷欄撳 E／滑鼠（寶箱：即刻開一個）；背包 Use 掣（寶箱：放上快捷欄、揀咗佢、收埋背包、開一個）
  function useGear(type, fromHotbar = false) {
    if (!(state.gears || []).some((g) => g.type === type)) return popup(`You have no ${gearInfo(type).name}s!`);
    if (isChestGear(type)) {
      if (!fromHotbar) {
        const key = `gear:${type}`;
        let slot = hotbarItems().findIndex((e) => e?.key === key);
        if (slot < 0) {
          const items = hotbarItems();
          slot = items.findIndex((e, i) => i >= hotbarToolCount() && !e);
          if (slot < 0) slot = hotbarToolCount();
          assignHotbar(slot, key);
        }
        selectSlot(slot);
        if (isOpen()) ctx.togglePanel('inventory');
        popup(`🧰 Your chests are in hotbar slot ${(slot + 1) % 10} - click or press E to open more!`);
      }
      return ctx.openChest?.(type);
    }
    ctx.play('click');
    open(type);
  }

  return { open, useGear, mutatePet, toggle: () => (isOpen() ? ctx.togglePanel('inventory') : open()), rerender };
}
