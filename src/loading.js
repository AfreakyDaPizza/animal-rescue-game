// ================= ⏳ 載入畫面（Issue #8：小朋友要「更好嘅載入畫面」）=================
// 去另一個世界（Halloween、Ghost World、返 Hub）或者起大嘢嗰陣遮住個畫面。
// 用法：
//   const ok = await showLoading('🎃 Building the Halloween World...', async (progress) => {
//     ... progress(0.5) ...           // 0–1，真實進度（可以唔叫，條會自己慢慢行）
//   }, 1.8, { theme: 'halloween', title: 'Halloween World', kicker: 'Travelling to' });
//   if (!ok) return;                   // 出錯／太耐 → 已經收埋畫面兼彈咗出錯卡
// theme：'nature'（普通世界）／'halloween'／'ghost'／'hell'（🔥 Halloween World 2）
// 最少顯示 minSeconds 秒；loading.active = true 嗰陣其他嘢（暫停、Boss）會停
// 第一次開網頁：index.html 已經有 #loading-screen（class="boot"），main.js 起好叫 finishBoot()
import { ANIMALS } from './data/animals.js';

export const loading = { active: false };

// ---- 每款嘅樣（背景飄嘅 emoji、橫飛嘅嘢、圈圈公轉嘅嘢、進度條上面跑嘅嘢）----
const THEMES = {
  nature: {
    kicker: 'Travelling to', title: 'Animal Rescue Park', rider: '🐾', orbit: '🍃',
    floaters: ['🐼', '🐘', '🐢', '🦏', '🦜', '🍃', '🐯', '🌿'], flyers: ['🦋', '🐦'], icons: null,
  },
  halloween: {
    kicker: 'Travelling to', title: 'Halloween World', rider: '🎃', orbit: '🦇',
    floaters: ['🎃', '👻', '🍬', '🕸️', '🕯️', '🍭', '🎃', '💀'], flyers: ['🦇', '🦇', '🦇'], icons: ['🎃', '👻', '🦇', '🕷️'],
  },
  ghost: {
    kicker: 'All aboard!', title: 'Ghost World', rider: '🚂', orbit: '👻',
    floaters: ['👻', '✨', '💀', '🕯️', '👻', '🔮', '✨', '👻'], flyers: ['🚂', '👻'], icons: ['👻', '🔮', '💀', '🧹'],
  },
  // 🔥 Halloween World 2（Issue #11）：熔岩紅天、火山、火星
  hell: {
    kicker: 'World 2 · Travelling to', title: 'Hell', rider: '🔥', orbit: '🦇',
    floaters: ['🔥', '🌋', '💀', '🔥', '🪨', '🍬', '🔥', '⛓️'], flyers: ['🦇', '🦇', '🧹'], icons: ['🔥', '🌋', '🏰', '🧙‍♀️'],
  },
};

// ---- 提示（玩法）+ 動物知識（真資料，src/data/animals.js）----
const TIPS = {
  nature: [
    '🏃 Train on the Treadmill to get faster. Bosses are quick!',
    '🧠 Study at the Student Table to raise your IQ for the quizzes.',
    '🥚 Put rescued animals in a Breeding Machine to get pets.',
    '🌙 At night the biome gates close. Get back to the Hub in time!',
    '📖 Press I to open the Index and see every animal you saved.',
  ],
  halloween: [
    '🎃 The Spawn Ruins are a SAFE ZONE. Bosses cannot go inside!',
    '👻 When you grab an egg, the fog closes in... follow the red arrow back!',
    '🚂 The Phantom Express arrives every hour. Catch ghosts for 30 minutes!',
    '🔮 Trade 400 Soul Dust at the Statue of Halloween for a Halloween Shard.',
    '🎣 Better fishing rods catch better Halloween eggs.',
    '🦇 Every biome boss chases you. NO MERCY!',
    '🪦 Put your eggs in the Egg Graveyard to hatch them.',
  ],
  hell: [
    '🔥 Jump across the flying lava rocks to reach the Witch Castle!',
    '🚩 Touch a checkpoint flag. If you fall in the lava, you go back there.',
    '🌀 Some rocks spin around. Jump when the next rock comes close!',
    '🧙‍♀️ Talk to the Witch in the castle. She knows the way into the tower.',
    '🍬 Soul Candy comes from beating the Pumpkin Reaper Dragon.',
    '🏃 More Speed = longer jumps. Train on the Treadmill!',
  ],
  ghost: [
    '🧹 Hold E (or the mouse button) to suck up ghosts.',
    '🧹 A better vacuum catches ghosts faster.',
    '👻 Stronger ghosts take longer to catch. Keep holding!',
    '🚂 The Phantom Express leaves after 30 minutes. Do not miss it!',
    '🔮 Ghosts give Soul Dust. Save it for a Halloween Shard!',
  ],
};
const FACTS = ANIMALS.filter((a) => a.fact);
const STATUS_COLOR = {
  'Critically Endangered': '#c62828', Endangered: '#e65100', Vulnerable: '#f9a825', 'Near Threatened': '#7cb342', 'Least Concern': '#2e7d32',
};

// ---- 拎個 overlay（index.html 有；冇就自己起）----
let el = null;
function ensureEl() {
  if (el) return el;
  el = document.getElementById('loading-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-screen';
    el.hidden = true;
    el.innerHTML = `
      <div class="ls-bg" aria-hidden="true"><div class="ls-rays"></div><div class="ls-orb"></div><div class="ls-clouds"></div><div class="ls-floaters"></div><div class="ls-flyers"></div><div class="ls-ground"></div></div>
      <div class="ls-card">
        <div class="ls-icon"><div class="ls-ring"></div><div class="ls-face"><span class="ls-animal"></span></div><div class="ls-orbit"><span></span></div></div>
        <div class="ls-kicker"></div><div class="ls-title"></div>
        <div class="ls-bar-wrap"><div class="ls-rider-track"><span class="ls-rider"></span></div><div class="ls-bar"><div class="ls-fill"></div><div class="ls-pct"></div></div></div>
        <div class="ls-status"></div>
        <div class="ls-tip"><div class="ls-tip-head"></div><div class="ls-tip-text"></div></div>
      </div>`;
    document.body.appendChild(el);
  }
  return el;
}
const $ = (sel) => ensureEl().querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// 背景：按主題重新放 emoji（隨機位置／速度，每次唔同）
function decorate(theme) {
  const t = THEMES[theme];
  const floaters = $('.ls-floaters');
  floaters.replaceChildren();
  t.floaters.forEach((emoji, i) => {
    const s = document.createElement('span');
    s.textContent = emoji;
    const x = 4 + (i / t.floaters.length) * 90 + Math.random() * 6;
    s.style.cssText = `--x:${x.toFixed(1)}%;--d:${(-Math.random() * 14).toFixed(1)}s;--t:${(11 + Math.random() * 7).toFixed(1)}s;--s:${36 + Math.round(Math.random() * 22)}px`;
    floaters.appendChild(s);
  });
  const flyers = $('.ls-flyers');
  flyers.replaceChildren();
  t.flyers.forEach((emoji, i) => {
    const f = document.createElement('div');
    f.className = 'ls-flyer';
    const train = emoji === '🚂';
    // 鬼火車喺地平線度跑；蝙蝠／蝴蝶喺天上飛
    const y = train ? 76 : 14 + i * 16 + Math.random() * 8;
    f.style.cssText = `--y:${y}%;--t:${(train ? 6 : 6 + Math.random() * 5).toFixed(1)}s;--d:${(-Math.random() * 6).toFixed(1)}s;--s:${train ? 56 : 30 + Math.round(Math.random() * 14)}px`;
    f.innerHTML = `<i>${emoji}</i>`;
    if (!train) f.firstChild.style.transform = 'scaleX(-1)'; // 面向前飛
    flyers.appendChild(f);
  });
  const clouds = $('.ls-clouds');
  if (!clouds.children.length) {
    for (const [top, tt, d] of [[12, 46, -8], [30, 60, -34], [52, 52, -20]]) {
      const c = document.createElement('div');
      c.className = 'ls-cloud';
      c.style.cssText = `top:${top}%;--t:${tt}s;--d:${d}s`;
      clouds.appendChild(c);
    }
  }
}

// 個標題分兩色（同開始畫面 logo 一樣：一個字黃、一個字綠）
function setTitle(text) {
  const box = $('.ls-title');
  box.replaceChildren();
  text.toUpperCase().split(' ').forEach((word, i) => {
    if (i) box.append(' ');
    const s = document.createElement('span');
    s.textContent = word;
    box.appendChild(s);
  });
}

// ---- 提示輪住換（每 4.2 秒）；動物知識會換埋中間隻動物 ----
let tipTimer = null;
let lastTip = null;
function nextTip(theme, instant = false) {
  const t = THEMES[theme];
  const useFact = theme === 'nature' ? Math.random() < 0.7 : Math.random() < 0.45;
  let tip;
  do {
    tip = useFact ? { fact: pick(FACTS) } : { text: pick(TIPS[theme]) };
  } while ((tip.fact || tip.text) === lastTip && (useFact ? FACTS.length : TIPS[theme].length) > 1);
  lastTip = tip.fact || tip.text;
  const box = $('.ls-tip');
  const show = () => {
    const head = $('.ls-tip-head');
    const body = $('.ls-tip-text');
    body.replaceChildren();
    if (tip.fact) {
      const a = tip.fact;
      head.textContent = '🌍 Did you know?';
      const name = document.createElement('b');
      name.textContent = `${a.emoji} ${a.name}`;
      const tag = document.createElement('span');
      tag.className = 'ls-status-tag';
      tag.textContent = a.status;
      tag.style.setProperty('--tag', STATUS_COLOR[a.status] || '#43a047');
      body.append(name, tag, document.createElement('br'), a.fact);
      setIcon(a.emoji);
    } else {
      head.textContent = '💡 Ranger tip';
      const [, emoji, rest] = tip.text.match(/^(\S+)\s+(.*)$/u) || [null, null, tip.text];
      body.textContent = rest;
      setIcon(emoji || (t.icons ? pick(t.icons) : pick(FACTS).emoji)); // 提示前面個 emoji 放入中間個圈
    }
    box.classList.remove('out');
  };
  if (instant) show();
  else {
    box.classList.add('out');
    setTimeout(show, 350);
  }
}
function setIcon(emoji) {
  const a = $('.ls-animal');
  if (a.textContent === emoji) return;
  a.textContent = emoji;
  a.classList.remove('swap');
  void a.offsetWidth;
  a.classList.add('swap');
}
function startTips(theme) {
  clearInterval(tipTimer);
  nextTip(theme, true);
  tipTimer = setInterval(() => nextTip(theme), 4200);
}

// ---- 進度條：顯示值慢慢追真實值（唔會跳）----
function setBar(p) {
  const v = Math.max(0, Math.min(1, p));
  ensureEl().style.setProperty('--p', v.toFixed(4));
  $('.ls-pct').textContent = `${Math.round(v * 100)}%`;
}

// ---- 出錯細卡（遊戲唔會卡死喺載入畫面）----
function showError(message) {
  document.getElementById('loading-error')?.remove();
  const card = document.createElement('div');
  card.id = 'loading-error';
  card.setAttribute('role', 'alertdialog');
  card.innerHTML = '<h2>😵 Oops!</h2><p></p><button type="button">OK</button>';
  card.querySelector('p').textContent = message;
  const close = () => card.remove();
  card.querySelector('button').addEventListener('click', close);
  setTimeout(close, 8000);
  document.body.appendChild(card);
}

// 一次只得一個載入畫面：第二個會排隊
let queue = Promise.resolve();

// 主角：顯示載入畫面，做 task，做完（最少 minSeconds 秒）淡出。成功 → true；出錯／太耐 → false
export function showLoading(text, task, minSeconds = 1.8, opts = {}) {
  const run = queue.then(() => runLoading(text, task, minSeconds, opts));
  queue = run.catch(() => {});
  return run;
}

async function runLoading(text, task, minSeconds, { theme = guessTheme(text), title, kicker, maxSeconds = 45 } = {}) {
  if (!THEMES[theme]) theme = 'nature';
  const e = ensureEl();
  finishBootNow(); // 萬一第一次載入畫面仲喺度
  loading.active = true;
  e.classList.remove('boot');
  e.dataset.theme = theme;
  decorate(theme);
  $('.ls-kicker').textContent = kicker || THEMES[theme].kicker;
  setTitle(title || THEMES[theme].title);
  $('.ls-status').textContent = text;
  $('.ls-rider').textContent = THEMES[theme].rider;
  $('.ls-orbit span').textContent = THEMES[theme].orbit;
  startTips(theme);
  setBar(0);
  e.hidden = false;
  void e.offsetWidth;
  e.classList.add('show');

  // 進度：有叫 progress() 就跟真實值；冇叫就跟時間慢慢行到 90%。都唔會快過最少時間
  const start = performance.now();
  let real = 0;
  let reported = false;
  let done = false;
  let shown = 0;
  let raf = 0;
  let last = start;
  const tick = () => {
    const now = performance.now();
    const t = Math.min(1, (now - start) / (minSeconds * 1000));
    const target = done ? t : reported ? Math.min(real, t) : 0.9 * t;
    shown += (Math.max(shown, target) - shown) * (1 - Math.exp(-(now - last) / 120)); // 跟時間追，卡機都唔會慢晒
    last = now;
    setBar(shown);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const progress = (p, label) => {
    reported = true;
    real = Math.max(real, Math.min(1, +p || 0));
    if (label) $('.ls-status').textContent = label;
  };

  await wait(380); // 等個畫面淡入咗先開始起嘢（起嘢會卡住畫面）
  let ok = true;
  let timeout = 0;
  try {
    await Promise.race([
      Promise.resolve().then(() => task?.(progress)),
      new Promise((_, reject) => (timeout = setTimeout(() => reject(new Error('timeout')), maxSeconds * 1000))),
    ]);
  } catch (err) {
    ok = false;
    console.error('[loading] task failed:', err);
  }
  clearTimeout(timeout);
  done = true;
  real = 1;
  if (ok) {
    const left = minSeconds * 1000 - (performance.now() - start);
    if (left > 0) await wait(left);
    shown = 1;
    setBar(1);
    $('.ls-status').textContent = '✨ Here we go!';
    await wait(260);
  }
  cancelAnimationFrame(raf);
  clearInterval(tipTimer);
  e.classList.remove('show');
  await wait(420);
  e.hidden = true;
  loading.active = false;
  if (!ok) showError('Something went wrong while loading. You can keep playing. Try again in a moment!');
  return ok;
}

// 冇講主題就睇文字估
function guessTheme(text = '') {
  if (/🎃|halloween/i.test(text)) return 'halloween';
  if (/🚂|👻|ghost|phantom/i.test(text)) return 'ghost';
  return 'nature';
}

// ---- 第一次開網頁 ----
// index.html 個畫面一開就見到（CSS 動畫慢慢行）；main.js 載完就換上真動物知識，起好第一格畫面就淡出
let booting = false;
export function startBoot() {
  const e = ensureEl();
  if (!e.classList.contains('boot')) return;
  booting = true;
  loading.active = true;
  startTips('nature');
}
export async function finishBoot() {
  const e = ensureEl();
  if (!e.classList.contains('boot')) return;
  booting = true;
  // 條由 CSS 動畫行緊嘅位置跳去 100%
  e.classList.remove('boot');
  setBar(1);
  $('.ls-status').textContent = 'Ready!';
  await wait(350);
  if (!booting) return; // 等緊嗰陣已經開咗另一個載入畫面
  finishBootNow();
}
function finishBootNow() {
  if (!booting) return;
  booting = false;
  const e = ensureEl();
  e.classList.remove('boot', 'show');
  clearInterval(tipTimer);
  loading.active = false;
  setTimeout(() => {
    if (!loading.active) e.hidden = true;
  }, 420);
}
