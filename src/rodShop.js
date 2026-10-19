// 🎣 魚竿舖（Halloween 釣魚湖）：15 支魚竿、蛋嘅機會率、面板 HTML
// 唔 import hud.js（hud.js 會 import 呢度攞 rodShopHtml），買嘢經 setRodShopActions 傳入
import { state } from './state.js';
import { FISHING_RODS, FISHING_RARITY_BOOST, rarityInfo } from './data/balance.js';
import { HALLOWEEN_PETS, HALLOWEEN_EGG_WEIGHT } from './data/halloween.js';
import { short } from './format.js';

export const RODS = FISHING_RODS;
export const currentRod = () => (state.rod === null || state.rod === undefined ? null : RODS[state.rod] || null);

// 每隻蛋嘅權重：基本（HALLOWEEN_EGG_WEIGHT）× (1 + luck × boost)；Eternal 要 rod.eternal 先有
export function eggWeights(rod) {
  return HALLOWEEN_PETS.map((p) => {
    let w = HALLOWEEN_EGG_WEIGHT[p.rarity] * Math.max(0.05, 1 + rod.luck * (FISHING_RARITY_BOOST[p.rarity] ?? 0));
    if (p.rarity === 'Eternal') w *= rod.eternal;
    return { pet: p, w };
  });
}
export function rollFishEgg(rod, rand = Math.random()) {
  const list = eggWeights(rod);
  let roll = rand * list.reduce((n, e) => n + e.w, 0);
  return (list.find((e) => (roll -= e.w) < 0) || list[0]).pet;
}
// 每種稀有度嘅機會（%）
export function rarityOdds(rod) {
  const list = eggWeights(rod);
  const total = list.reduce((n, e) => n + e.w, 0);
  const out = {};
  for (const e of list) out[e.pet.rarity] = (out[e.pet.rarity] || 0) + (e.w / total) * 100;
  return out;
}

let actions = null;
export function setRodShopActions(a) {
  actions = a;
}

const pct = (n) => (n >= 10 ? n.toFixed(0) : n >= 1 ? n.toFixed(1) : n >= 0.01 ? n.toFixed(2) : '0');
export function rodShopHtml() {
  const cur = currentRod();
  const rows = RODS.map((r, i) => {
    const odds = rarityOdds(r);
    const own = state.rod === i;
    const can = state.money >= r.price;
    const odd = (name) => {
      const c = rarityInfo(name).color;
      return `<span style="color:${c === '#cfd8dc' ? '#78909c' : c}">${pct(odds[name] || 0)}%</span>`;
    };
    return `<div class="card-animal rod-card ${own ? 'equipped' : ''}" style="border-color:${r.glow}">
      <div class="rod-swatch" style="height:10px;border-radius:6px;margin-bottom:6px;background:linear-gradient(90deg, ${r.color}, ${r.glow})"></div>
      <b>${i + 1}. ${r.name}</b>
      <small>⏱️ Bites in ${r.bite[0]}–${r.bite[1]} s</small>
      <small>Legendary ${odd('Legendary')} · Mythic ${odd('Mythic')}</small>
      <small>✨ Eternal ${odd('Eternal')}</small>
      <span class="kg">💰 $${short(r.price)}</span>
      <div class="pet-actions">${own ? '<button class="grey" disabled>✔ Equipped</button>' : `<button data-rod="${i}" ${can ? '' : 'disabled class="grey"'}>${can ? '🎣 Buy & equip' : 'Not enough money'}</button>`}</div>
    </div>`;
  }).join('');
  return `<p class="index-summary">${cur ? `🎣 You are holding the <b>${cur.name}</b>. Walk to the end of the dock or the lake shore and press <kbd>E</kbd> to fish!` : '🎣 Buy a rod, then fish for <b>Halloween eggs</b> at the dock!'}</p>
    <p class="hint">💀 Skeleton Sam says: "Better rods = faster bites and RARER eggs. Only the very best rods can catch the ETERNAL Voidseer Pumpkin egg!"</p>
    <p class="hint">⚠️ Your rod <b>crumbles to dust</b> when you go back to the normal world. Buy it again next visit!</p>
    <div class="cards">${rows}</div>`;
}

// 面板入面撳「Buy」
document.getElementById('panel-body')?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-rod]');
  if (!b || !actions || document.getElementById('panel')?.dataset.kind !== 'rods') return;
  actions.buy(Number(b.dataset.rod));
  document.getElementById('panel-body').innerHTML = rodShopHtml();
});
