// 💾 存檔提示（小朋友 2026-10-22）：得到新寵物／Gear／物種 → 右下角閃「💾 Saved!」；存唔到 → 紅色警告
const el = document.createElement('div');
el.id = 'save-toast';
document.body.appendChild(el);
let hideTimer = 0;
function show(text, bad = false, ms = 1600) {
  el.textContent = text;
  el.className = `show${bad ? ' bad' : ''}`;
  clearTimeout(hideTimer);
  if (ms) hideTimer = setTimeout(() => (el.className = ''), ms);
}
window.addEventListener('game-save', (e) => {
  const d = e.detail || {};
  if (!d.ok) show('⚠️ Your game can\'t save in this window! (private window or no space) - progress will be lost when you close it', true, 0);
  else if (d.good) show('💾 Saved!');
  else if (el.classList.contains('bad')) show('💾 Saving works again!');
});
