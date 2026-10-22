// ⚡ Boosts（小朋友 2026-10-22）：喺 Meteoric Shop 用 💎 買，有時限嘅加成
// state.boosts = { id: endsAt（毫秒，真實時鐘）}；再買同一款 = 喺剩低嘅時間上面再加
// 數值（幾多倍、幾耐、幾錢）喺 data/meteorShop.js 嘅 BOOSTS
//
// 其他檔案用 boostMult(id) 攞倍數（冇開 = 1）：
//   'speed'     → player.js 行路速度
//   'money'     → hub.js moneyPerSecond（地塊收入）
//   'treadmill' → hub.js 跑步機、gym.js 4X Treadmill 嘅 Speed
//   'iq'        → 所有 IQ（hub.js 學生桌、gym.js 嘅 IQ）
//   'table'     → hub.js 學生桌（同 'iq' 疊埋 = x4）
// 頭頂（左邊）有細細粒嘅「chip」顯示開咗邊啲同仲有幾耐

import { state, save } from './state.js';
import { BOOSTS } from './data/meteorShop.js';

export const findBoost = (id) => BOOSTS.find((b) => b.id === id);

// 仲有幾多秒（冇開 = 0）
export function boostLeft(id, now = Date.now()) {
  const end = state.boosts?.[id] || 0;
  return Math.max(0, (end - now) / 1000);
}
export const boostMult = (id) => (boostLeft(id) > 0 ? findBoost(id)?.mult || 1 : 1);

// 買咗：加時間（未完就喺尾加）
export function addBoost(id) {
  const b = findBoost(id);
  if (!b) return 0;
  const now = Date.now();
  state.boosts = { ...(state.boosts || {}) };
  state.boosts[id] = Math.max(now, state.boosts[id] || 0) + b.minutes * 60000;
  save();
  renderChips();
  return boostLeft(id, now);
}

export const formatLeft = (sec) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- HUD chips ----------
const CSS = `
#boost-chips { position: fixed; left: 12px; bottom: calc(var(--stats-bottom, 12px) + 196px); z-index: 6; display: flex; flex-direction: column-reverse; gap: 5px; pointer-events: none; }
body.in-halloween:not(.mobile) #boost-chips { bottom: calc(var(--stats-bottom, 12px) + 228px); }
#boost-chips:empty { display: none; }
.boost-chip { display: flex; align-items: center; gap: 6px; padding: 3px 10px 3px 6px; border-radius: 999px; font: 800 14px/1.2 "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif; color: #e1f5fe;
  background: linear-gradient(90deg, rgba(26,35,126,0.92), rgba(40,53,147,0.85)); border: 2px solid #40c4ff; box-shadow: 0 0 10px rgba(64,196,255,0.55); text-shadow: 0 1px 2px #000; white-space: nowrap; }
.boost-chip .bc-emoji { font-size: 16px; }
.boost-chip .bc-time { color: #80d8ff; font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; }
.boost-chip.ending { animation: boost-blink 0.6s ease-in-out infinite alternate; border-color: #ffab40; }
.boost-chip.pop { animation: boost-pop 0.5s cubic-bezier(.2,1.6,.4,1); }
@keyframes boost-blink { from { opacity: 1; } to { opacity: 0.45; } }
@keyframes boost-pop { 0% { transform: scale(0.4); } 100% { transform: scale(1); } }
/* 手機：細啲；打橫 = 數值盒下面；打直 = 搖桿上面 */
body.mobile #boost-chips { bottom: auto; top: calc(var(--m-row2, 56px) + 26px); left: calc(var(--m-edge, 8px) + env(safe-area-inset-left, 0px)); flex-direction: column; gap: 3px; }
body.mobile .boost-chip { font-size: 11px; padding: 2px 7px 2px 4px; border-width: 1.5px; gap: 3px; }
body.mobile .boost-chip .bc-emoji { font-size: 12px; }
body.mobile .boost-chip .bc-name { display: none; }
body.mobile .boost-chip .bc-time { min-width: 26px; }
@media (orientation: portrait) {
  body.mobile #boost-chips { top: auto; bottom: calc(var(--m-joy-bottom, 120px) + var(--m-joy, 110px) + 10px); flex-direction: column-reverse; }
}
body.in-movie #boost-chips, body.fishing #boost-chips { visibility: hidden; }
`;

let box = null;
let lastSig = '';
function ensureDom() {
  if (box) return box;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  box = document.createElement('div');
  box.id = 'boost-chips';
  document.body.appendChild(box);
  return box;
}

export function renderChips() {
  if (typeof document === 'undefined') return;
  ensureDom();
  const now = Date.now();
  const live = BOOSTS.filter((b) => boostLeft(b.id, now) > 0);
  // 過咗期嘅清走（存檔唔好越儲越多）
  if (state.boosts && Object.keys(state.boosts).some((id) => boostLeft(id, now) <= 0)) {
    state.boosts = Object.fromEntries(Object.entries(state.boosts).filter(([id]) => boostLeft(id, now) > 0));
  }
  const sig = live.map((b) => b.id).join(',');
  if (sig !== lastSig) {
    const old = new Set(lastSig.split(','));
    box.innerHTML = live.map((b) => `<div class="boost-chip${old.has(b.id) ? '' : ' pop'}" data-boost-chip="${b.id}" title="${b.name}"><span class="bc-emoji">${b.emoji}</span><span class="bc-name">${b.name}</span><span class="bc-time"></span></div>`).join('');
    lastSig = sig;
  }
  for (const b of live) {
    const chip = box.querySelector(`[data-boost-chip="${b.id}"]`);
    const left = boostLeft(b.id, now);
    chip.querySelector('.bc-time').textContent = formatLeft(left);
    chip.classList.toggle('ending', left < 30);
  }
}

// 每半秒更新倒數（真實時鐘，暫停都照倒數）
export function startBoostChips() {
  renderChips();
  setInterval(renderChips, 500);
}
