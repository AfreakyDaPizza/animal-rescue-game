// 畫面右邊中間兩粒四方掣（小朋友 2026-10-18 重新設計 UI）：
//   🐾 My Plot Pets：地塊上面嘅寵物 + 每隻 $/s，可以 Unequip（要放上地塊先 Equip 到）
//   ⏱️ Machine Timers：每部繁殖機仲有幾耐
// 細盒唔係全畫面面板，遊戲照玩；每次只開一個

import { state } from './state.js';
import { petPic } from './animalPics.js';
import { itemMoney, kgOf, formatKg } from './data/animals.js';
import { rarityInfo, plotMoneyMulti, MACHINE_LEVELS } from './data/balance.js';
import { moneyPerSecond, machineStatus, formatLeft } from './hub.js';
import { boost } from './events.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('en-US');

let open = null; // 'pets' | 'timers' | null
let opts = { machineCount: 5, unequip: () => {}, onToggle: () => {} };
let timer = 0;
let lastSig = '';

export function initSideBoxes(options) {
  opts = { ...opts, ...options };
  $('side-pets-btn').addEventListener('click', () => toggleSideBox('pets'));
  $('side-timers-btn').addEventListener('click', () => toggleSideBox('timers'));
  $('side-box').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-unequip]');
    if (!b) return;
    const pet = state.pets[Number(b.dataset.unequip)];
    if (pet?.onPlot) opts.unequip(pet);
    render(true);
  });
}

export const sideBoxOpen = () => open;

export function toggleSideBox(kind) {
  open = open === kind ? null : kind;
  $('side-pets-btn').classList.toggle('on', open === 'pets');
  $('side-timers-btn').classList.toggle('on', open === 'timers');
  $('side-box').hidden = !open;
  lastSig = '';
  render(true);
  opts.onToggle(open);
}

// 每格畫面叫；0.5 秒先更新一次
export function updateSideBoxes(dt) {
  if (!open) return;
  timer -= dt;
  if (timer > 0) return;
  timer = 0.5;
  render(false);
}

function render(force) {
  if (!open) return;
  if (open === 'pets') renderPets(force);
  else renderTimers(force);
}

function renderPets(force) {
  const box = $('side-box');
  const multi = boost.money * plotMoneyMulti(state.plotLevel);
  const pets = state.pets.map((p, i) => ({ p, i })).filter(({ p }) => p.onPlot);
  pets.sort((a, b) => itemMoney(b.p) - itemMoney(a.p));
  const sig = `pets|${pets.map(({ p, i }) => `${i}:${p.name}:${p.rarity}`).join(',')}|${multi}`;
  if (force || sig !== lastSig) {
    lastSig = sig;
    box.innerHTML = `<div class="side-head"><b>🐾 My Plot Pets</b><span class="side-total">💰 $<span id="side-total">${fmt(moneyPerSecond())}</span>/s</span></div>
      <div class="side-list">${pets.length ? pets.map(({ p, i }) => {
        const r = rarityInfo(p.rarity);
        return `<div class="side-row">${petPic(p.name, { rarity: p.rarity })}
          <div class="side-info"><b>${p.name}</b><small style="color:${r.color}">${r.name}${p.sizeMul ? ` · GIANT x${p.sizeMul}` : ''}${p.mutation === 'fire' ? ' · 🔥' : p.mutation === 'eclipse' ? ' · 🌑' : ''}</small>
          <small>⚖️ ${formatKg(kgOf(p))} · <span class="money">$${fmt(itemMoney(p) * multi)}/s</span></small></div>
          <button data-unequip="${i}">Unequip</button></div>`;
      }).join('') : '<p class="side-empty">No pets on your Plot yet.</p>'}</div>
      <p class="side-hint">To equip a pet, put it on your Plot 🌿</p>`;
  } else {
    const t = $('side-total');
    if (t) t.textContent = fmt(moneyPerSecond());
  }
}

function renderTimers(force) {
  const box = $('side-box');
  const level = MACHINE_LEVELS[(state.machineLevel || 1) - 1] || MACHINE_LEVELS[0];
  const rows = Array.from({ length: opts.machineCount }, (_, i) => ({ i, s: machineStatus(i) }));
  const sig = `timers|${level.name}|${rows.map(({ s }) => `${s.kind}:${s.name || ''}`).join(',')}`;
  if (force || sig !== lastSig) {
    lastSig = sig;
    box.innerHTML = `<div class="side-head"><b>⏱️ Machine Timers</b><span class="side-level">Lv ${state.machineLevel || 1} · ${level.name}</span></div>
      <div class="side-list">${rows.map(({ i, s }) => `<div class="side-row ${s.kind}">
        ${s.kind === 'empty' ? '<div class="pet-pic empty-machine"><span class="emoji">💗</span></div>' : petPic(s.first, {})}
        <div class="side-info"><b>Machine ${i + 1}</b><small>${s.kind === 'empty' ? 'Empty - put a rescued animal in!' : s.name}</small>
        <span class="side-time" data-machine="${i}">${timeText(s)}</span></div></div>`).join('')}</div>`;
  } else {
    for (const { i, s } of rows) {
      const el = box.querySelector(`[data-machine="${i}"]`);
      if (el) el.innerHTML = timeText(s);
    }
  }
}

function timeText(s) {
  if (s.kind === 'empty') return '';
  if (s.kind === 'ready') return '<span class="ready">✅ Ready to collect!</span>';
  const pct = Math.floor((1 - s.left / s.total) * 100);
  const speed = boost.machine > 1 ? ` · x${boost.machine}` : '';
  return `⏳ ${formatLeft(s.left)} left · ${pct}%${speed}`;
}
