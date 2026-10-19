// 大數字縮寫（小朋友 2026-10-18：30.2T 好過 30,200,000,000,000）
// 1,234 → 1.23K、5,600,000 → 5.6M、30,200,000,000,000 → 30.2T
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];

export function short(n) {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  const neg = n < 0;
  let v = Math.abs(n);
  if (v < 1000) return (neg ? '-' : '') + Math.floor(v).toString();
  let i = 0;
  while (v >= 1000 && i < SUFFIXES.length - 1) {
    v /= 1000;
    i++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const text = (Math.floor(v * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.0+$|(\.\d*?)0+$/, '$1'); // 向下取整：唔會未夠錢就顯示夠；淨係刪小數點後面嘅 0（以前 250K 會變 25K）
  return (neg ? '-' : '') + text + SUFFIXES[i];
}
