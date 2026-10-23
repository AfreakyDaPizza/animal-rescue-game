// 🔐 控制面板密碼閘（小朋友 Issue #14）：第一次打開控制面板要打密碼，啱咗就永遠解鎖（之後撳 Q 直接開）
// 個密碼唔會直接寫喺程式度（個 repo 係公開嘅）：只係存佢個 SHA-256，打完先計一次再比較
// 點解自己寫 SHA-256（唔用 crypto.subtle）：crypto.subtle 淨係 https／localhost 先有，NAS（http://nas.home）用唔到
// 解鎖記兩個位：state.adminUnlocked（跟存檔、雲端）+ localStorage 旗（還原舊存檔之後都仲記得）
import { state, save } from './state.js';

const PASS_HASH = 'c77eff1e419861abca680fab8f5a3f3973070000ba78a41d1fd23cbc05543cb1';
const FLAG_KEY = 'animal-rescue-admin-unlocked';

// ---------- SHA-256（純 JavaScript，同步）----------
const K = [];
{
  // 頭 64 個質數立方根嘅小數部分
  let n = 2;
  while (K.length < 64) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (prime) K.push((Math.cbrt(n) % 1) * 2 ** 32 >>> 0);
    n++;
  }
}
function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const m = new Uint8Array(total);
  m.set(bytes);
  m[len] = 0x80;
  const view = new DataView(m.buffer);
  view.setUint32(total - 8, Math.floor((len * 8) / 2 ** 32));
  view.setUint32(total - 4, (len * 8) >>> 0);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  const rot = (x, r) => (x >>> r) | (x << (32 - r));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => (h[i] = (h[i] + v) >>> 0));
  }
  return h.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export const checkPassword = (text) => sha256(String(text)) === PASS_HASH;

// 解鎖咗未：localStorage 有旗但存檔冇（例如還原咗舊存檔）→ 補返落存檔
export function adminUnlocked() {
  if (state.adminUnlocked) return true;
  try {
    if (localStorage.getItem(FLAG_KEY) === '1') {
      state.adminUnlocked = true;
      save();
      return true;
    }
  } catch {
    // 讀唔到就當未解鎖
  }
  return false;
}

export function unlockAdmin() {
  state.adminUnlocked = true;
  save();
  try {
    localStorage.setItem(FLAG_KEY, '1');
  } catch {
    // 存唔到旗都算，存檔已經記住
  }
}

// 密碼畫面（喺面板入面畫）；denied = 啱啱打錯
export function gateHtml(denied = false) {
  return `<div class="admin-gate ${denied ? 'denied' : ''}">
    <div class="gate-ring"><span>🔐</span></div>
    <p class="gate-kicker">RANGER HQ // SECURE TERMINAL</p>
    <h3 class="gate-title">ENTER ACCESS CODE</h3>
    <form class="gate-form" data-admin-gate autocomplete="off">
      <input id="admin-pass" type="password" placeholder="Password" aria-label="Admin password" autocomplete="off" spellcheck="false">
      <button type="submit" data-admin="pass">UNLOCK ▸</button>
    </form>
    <p class="gate-msg" id="admin-gate-msg" role="status">${denied ? '⛔ ACCESS DENIED' : 'Type the secret code once and the panel opens forever.'}</p>
  </div>`;
}
