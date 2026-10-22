// 🛒 一次過買好多個寶箱（小朋友 2026-10-22：「you can bulk buy chests」）
// Echo 舖（🌽 Candy Corn）同 Meteoric Shop（💎 Meteor Crystals）共用：x1 / x5 / x10 / x25 / MAX 掣
//
// 用法：
//   bulkButtons({ attr: 'data-echo="buy"', cost: 500, have: candyCorn, icon: '🌽' }) → HTML（一排掣，每粒有 data-n）
//   bulkCount(btn.dataset.n, cost, have) → 真正買幾多個（MAX 撳嗰陣先計）

export const BULK_SIZES = [1, 5, 10, 25];
export const BULK_MAX = 999; // MAX 最多一次買幾多個

const short = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}M` : n >= 1e4 ? `${Math.round(n / 100) / 10}K` : String(n));

export const maxAffordable = (cost, have) => Math.max(0, Math.min(BULK_MAX, Math.floor(have / cost)));

export function bulkCount(n, cost, have) {
  const want = n === 'max' ? maxAffordable(cost, have) : Math.max(1, Number(n) || 1);
  return want * cost <= have ? want : 0;
}

export function bulkButtons({ attr, cost, have, icon }) {
  ensureCss();
  const max = maxAffordable(cost, have);
  const btn = (n, label) => {
    const count = n === 'max' ? max : n;
    const can = count > 0 && count * cost <= have;
    return `<button ${attr} data-n="${n}" class="bulk-btn ${can ? '' : 'grey'}" ${can ? '' : 'disabled'}>
      <b>${label}</b><small>${icon} ${short(Math.max(1, count) * cost)}</small></button>`;
  };
  return `<div class="bulk-buy">${BULK_SIZES.map((n) => btn(n, `x${n}`)).join('')}${btn('max', max > 0 ? `MAX x${max}` : 'MAX')}</div>`;
}

let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.bulk-buy { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; width: 100%; }
.bulk-buy .bulk-btn { display: flex; flex-direction: column; align-items: center; padding: 5px 2px; margin: 0; min-width: 0; line-height: 1.1; }
.bulk-buy .bulk-btn b { font-size: 15px; }
.bulk-buy .bulk-btn small { display: block; font-size: 11px; font-weight: 800; color: inherit !important; opacity: 0.9; white-space: nowrap; }
.bulk-buy .bulk-btn:last-child { grid-column: 1 / -1; }
.bulk-have { display: block; margin: 4px 0; font-weight: 800; }
`;
  document.head.appendChild(st);
}
