// 手機版（小朋友 2026-10-17）：開場動畫之後揀一次「手機」定「電腦」（state.device，之後唔再問）
// 手機：左下搖桿行路、右邊手指拖轉鏡頭、JUMP／USE／⏸ 掣、鏡頭拉近拉遠
// 冇滑鼠鎖：MouseLook.virtual = true，lock()／unlock() 只係代表「玩緊／暫停」

import { touchInput } from './player.js';

const $ = (id) => document.getElementById(id);

// ---------- 揀裝置（只揀一次） ----------
export function showDeviceChooser(onChosen) {
  const el = document.createElement('div');
  el.id = 'device-chooser';
  el.className = 'overlay';
  el.innerHTML = `<div class="card">
      <h1>How do you want to play?</h1>
      <p>Pick the one you are using right now.</p>
      <div class="device-buttons">
        <button data-device="mobile">📱<b>MOBILE</b><small>Phone or tablet<br>Touch controls</small></button>
        <button data-device="pc">💻<b>PC</b><small>Computer<br>Keyboard + mouse</small></button>
      </div>
      <p class="hint">You can change it later in <b>📋 My Stats</b> (P).</p>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-device]');
    if (!b) return;
    el.remove();
    onChosen(b.dataset.device);
  });
}

// ---------- 手機控制 ----------
// controls：MouseLook；onUse = 撳 E；onPause = 暫停；onZoom(±1)；isPaused()
export function setupMobile({ controls, onUse, onPause, onZoom, isPaused }) {
  document.body.classList.add('mobile');
  controls.virtual = true;
  const ui = document.createElement('div');
  ui.id = 'touch-ui';
  ui.innerHTML = `
    <div id="joy-base"><div id="joy-knob"></div></div>
    <div id="touch-buttons">
      <button id="t-jump">JUMP</button>
      <button id="t-use">USE</button>
    </div>
    <div id="touch-top">
      <button id="t-zoom-in">＋</button>
      <button id="t-zoom-out">－</button>
      <button id="t-pause">⏸</button>
    </div>`;
  document.body.appendChild(ui);

  // 撳掣：用 touchstart 即刻反應（唔使等 click），同時擋住頁面捲動
  const tap = (id, fn) => {
    const b = $(id);
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('down');
      fn(true);
    }, { passive: false });
    const up = (e) => {
      e.preventDefault();
      b.classList.remove('down');
      fn(false);
    };
    b.addEventListener('touchend', up, { passive: false });
    b.addEventListener('touchcancel', up, { passive: false });
    b.addEventListener('click', () => fn(true) || fn(false)); // 用滑鼠試都得
  };
  tap('t-jump', (down) => (touchInput.jump = down));
  tap('t-use', (down) => down && onUse());
  tap('t-pause', (down) => down && onPause());
  tap('t-zoom-in', (down) => down && onZoom(-1));
  tap('t-zoom-out', (down) => down && onZoom(1));

  // 搖桿
  const base = $('joy-base');
  const knob = $('joy-knob');
  let R = 55; // 搖桿可以推幾遠（像素）：跟搖桿大細（mobileui.css 用 vmin 計，Issue #10）
  let joyId = null;
  let cx = 0;
  let cy = 0;
  const moveJoy = (t) => {
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchInput.x = dx / R;
    touchInput.y = -dy / R; // 向上推 = 向前行
  };
  const resetJoy = () => {
    joyId = null;
    touchInput.x = 0;
    touchInput.y = 0;
    knob.style.transform = '';
  };
  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    R = Math.max(36, r.width * 0.4);
    joyId = t.identifier;
    moveJoy(t);
  }, { passive: false });

  // 轉鏡頭：喺畫面（唔係掣）上面拖
  let lookId = null;
  let lx = 0;
  let ly = 0;
  const onUi = (el) => el.closest('button, .slot, #hotbar-wrap, #hud-buttons, #panel, #quiz, .overlay, #joy-base, #touch-buttons, #touch-top');
  window.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (lookId !== null || t.identifier === joyId || onUi(t.target)) continue;
      if (isPaused()) continue;
      lookId = t.identifier;
      lx = t.clientX;
      ly = t.clientY;
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) moveJoy(t);
      else if (t.identifier === lookId) {
        controls.look(t.clientX - lx, t.clientY - ly);
        lx = t.clientX;
        ly = t.clientY;
      }
    }
    if (joyId !== null || lookId !== null) e.preventDefault(); // 玩緊唔好捲動頁面
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) resetJoy();
      if (t.identifier === lookId) lookId = null;
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);

  // 開始畫面：「Tap to Play」
  const start = $('start-button');
  if (start) start.textContent = '▶ TAP TO PLAY';
  return { reset: resetJoy };
}
