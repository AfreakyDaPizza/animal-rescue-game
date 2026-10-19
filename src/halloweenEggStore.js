// 🥚 Halloween 蛋倉（暫時版）：釣魚釣到嘅蛋放入 state.hwEggs，之後 Egg Graveyard 先孵
// （蛋／Boss 嗰邊嘅 helper 做緊 src/halloweenEggs.js 嘅 addEgg；合併時用返同一個）
import { state } from './state.js';

export function addEgg(name, rarity) {
  state.hwEggs ??= [];
  const egg = { name, rarity, at: Date.now() };
  state.hwEggs.push(egg);
  return egg;
}
