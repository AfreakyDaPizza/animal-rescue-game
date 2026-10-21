// 遊戲入口：先搞掂帳號登入（account.js），再載個遊戲（main.js）
// main.js 一 import 就會讀存檔（state.js），所以一定要等登入、放好雲端存檔先 import
import { startAccount, account, logout } from './account.js';

function accountBadge() {
  const card = document.querySelector('#start .start-card');
  if (!card) return;
  const p = document.createElement('p');
  p.className = 'account-badge';
  p.innerHTML = `👤 <b></b> · <span class="sync"></span> <button type="button">Log out</button>`;
  p.querySelector('b').textContent = account.name;
  p.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation();
    e.target.disabled = true;
    e.target.textContent = 'Saving...';
    logout();
  });
  card.appendChild(p);
  const sync = p.querySelector('.sync');
  const tick = () => {
    if (account.offline) sync.textContent = '📡 offline, saving on this computer';
    else if (!account.lastSync) sync.textContent = '☁️ progress saves online';
    else sync.textContent = `☁️ saved ${Math.max(0, Math.round((Date.now() - account.lastSync) / 1000))}s ago`;
  };
  tick();
  setInterval(tick, 1000);
}

(async () => {
  const on = await startAccount();
  await import('./main.js');
  if (on) accountBadge();
})();
