// 🎣 魚竿舖（Halloween 釣魚湖）：15 支魚竿、釣到咩嘅機會率、面板 HTML
// Issue #8 #9（2026-10-21）：Twig Rod 免費；其他用 🌽 Candy Corn 買（升級），買咗會存低，唔會再斷
// 唔 import hud.js（hud.js 會 import 呢度攞 rodShopHtml），買嘢經 setRodShopActions 傳入
import { state } from './state.js';
import { FISHING_RODS, FISHING_RARITY_BOOST, FISHING_CANDY_BASE, FISHING_CANDY_GROWTH, FISHING_CANDY_CHANCE, FISHING_CANDY_PILES, FISHING_POWER_LUCK, rarityInfo } from './data/balance.js';
import { HALLOWEEN_PETS, HALLOWEEN_EGG_WEIGHT } from './data/halloween.js';
import { short } from './format.js';

export const RODS = FISHING_RODS;
// 而家嘅魚竿：舊存檔可能係 null（以前會斷）→ 當 Twig Rod
export const rodIndex = () => Math.max(0, Math.min(RODS.length - 1, Number.isInteger(state.rod) ? state.rod : 0));
export const currentRod = () => RODS[rodIndex()];

// 每隻蛋嘅權重：基本（HALLOWEEN_EGG_WEIGHT）× (1 + luck × boost)；Eternal 要 rod.eternal 先有
// bonusLuck：力度條越高，運氣越好
export function eggWeights(rod, bonusLuck = 0) {
  const luck = rod.luck + bonusLuck;
  return HALLOWEEN_PETS.map((p) => {
    let w = HALLOWEEN_EGG_WEIGHT[p.rarity] * Math.max(0.05, 1 + luck * (FISHING_RARITY_BOOST[p.rarity] ?? 0));
    if (p.rarity === 'Eternal') w *= rod.eternal;
    return { pet: p, w };
  });
}
export function rollFishEgg(rod, bonusLuck = 0, rand = Math.random()) {
  const list = eggWeights(rod, bonusLuck);
  let roll = rand * list.reduce((n, e) => n + e.w, 0);
  return (list.find((e) => (roll -= e.w) < 0) || list[0]).pet;
}
// 每種稀有度嘅機會（%）
export function rarityOdds(rod, bonusLuck = 0) {
  const list = eggWeights(rod, bonusLuck);
  const total = list.reduce((n, e) => n + e.w, 0);
  const out = {};
  for (const e of list) out[e.pet.rarity] = (out[e.pet.rarity] || 0) + (e.w / total) * 100;
  return out;
}

// 🌽 Candy Corn 基本數：每支好啲嘅魚竿 ×1.28
export const candyBase = (i) => Math.round(FISHING_CANDY_BASE * FISHING_CANDY_GROWTH ** i);
// 🌽 一堆有幾多（power 0–1：力度條幾高）→ { amount, pile }
export function rollCandy(i, power, rand = Math.random) {
  const piles = FISHING_CANDY_PILES.map((p) => ({ ...p, w: p.chance + (p.bonus || 0) * power }));
  let roll = rand() * piles.reduce((n, p) => n + p.w, 0);
  const pile = piles.find((p) => (roll -= p.w) < 0) || piles[0];
  const mul = pile.mul[0] + rand() * (pile.mul[1] - pile.mul[0]);
  const amount = Math.max(1, Math.round(candyBase(i) * mul * (0.6 + 0.8 * power)));
  return { amount, pile };
}
// 釣到咩：Candy Corn（60%）定蛋（40%）
export function rollCatch(power, rand = Math.random) {
  const i = rodIndex();
  const rod = RODS[i];
  if (rand() < FISHING_CANDY_CHANCE) return { kind: 'candy', ...rollCandy(i, power, rand) };
  return { kind: 'egg', pet: rollFishEgg(rod, power * FISHING_POWER_LUCK, rand()) };
}

let actions = null;
export function setRodShopActions(a) {
  actions = a;
}

const pct = (n) => (n >= 10 ? n.toFixed(0) : n >= 1 ? n.toFixed(1) : n >= 0.01 ? n.toFixed(2) : '0');
export function rodShopHtml() {
  const cur = currentRod();
  const mine = rodIndex();
  const next = RODS[mine + 1];
  const rows = RODS.map((r, i) => {
    const odds = rarityOdds(r);
    const can = state.candyCorn >= r.price;
    const odd = (name) => {
      const c = rarityInfo(name).color;
      return `<span style="color:${c === '#cfd8dc' ? '#78909c' : c}">${pct(odds[name] || 0)}%</span>`;
    };
    let btn;
    if (i === mine) btn = '<button class="grey" disabled>🎣 Holding</button>';
    else if (i < mine) btn = '<button class="grey" disabled>✔ Owned</button>';
    else btn = `<button data-rod="${i}" ${can ? '' : 'disabled class="grey"'}>${can ? '🌽 Upgrade!' : `Need ${short(r.price - state.candyCorn)} more 🌽`}</button>`;
    return `<div class="card-animal rod-card ${i === mine ? 'equipped' : ''}" style="border-color:${r.glow}">
      <div class="rod-swatch" style="height:10px;border-radius:6px;margin-bottom:6px;background:linear-gradient(90deg, ${r.color}, ${r.glow})"></div>
      <b>${i + 1}. ${r.name}</b>
      <small>⏱️ Bites in ${r.bite[0]}–${r.bite[1]} s · 🌽 ${candyBase(i)}+ per catch</small>
      <small>Legendary ${odd('Legendary')} · Mythic ${odd('Mythic')}</small>
      <small>✨ Eternal ${odd('Eternal')}</small>
      <span class="kg">${r.price ? `🌽 ${short(r.price)} Candy Corn` : '🎁 FREE'}</span>
      <div class="pet-actions">${btn}</div>
    </div>`;
  }).join('');
  return `<p class="index-summary">🌽 Candy Corn: <b>${short(state.candyCorn)}</b> · 🎣 You are holding the <b>${cur.name}</b>${next ? ` · Next: <b>${next.name}</b> (🌽 ${short(next.price)})` : ' (the BEST rod!)'}</p>
    <p class="hint">💀 Skeleton Sam says: "Walk to the end of the dock or the lake shore and press <kbd>E</kbd>. Stop the power bar HIGH for more luck, then SPAM <kbd>E</kbd> (or click / tap USE) to reel it in! You catch 🌽 Candy Corn or a Halloween egg."</p>
    <p class="hint">🌽 Better rods = faster bites, more Candy Corn and RARER eggs. Only the very best rods can catch the ETERNAL Voidseer Pumpkin egg! Your rod is yours to keep.</p>
    <div class="cards">${rows}</div>`;
}

// 面板入面撳「Upgrade」
document.getElementById('panel-body')?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-rod]');
  if (!b || !actions || document.getElementById('panel')?.dataset.kind !== 'rods') return;
  actions.buy(Number(b.dataset.rod));
  document.getElementById('panel-body').innerHTML = rodShopHtml();
});
