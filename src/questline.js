// 🐾 Echo's Questline 嘅「腦」（小朋友 2026-10-22）：10 個一個接一個嘅每日任務，越後越難、獎越好
// 呢個檔好細（冇 THREE、冇畫面），俾釣魚、蛋、火車、吸塵機、雕像嗰啲檔 import 嚟報數：
//   questline.track('fishCatch')                 // 釣到嘢
//   questline.track('candyFish', 25)             // 釣到 25 粒 Candy Corn
//   questline.track('eggRescue', 1, { biome })   // 帶蛋返到安全區（biome 0–2）
// 攤位、面板、HUD 喺 echoQuestStall.js
// 存檔：state.echoQuests = { day, index, progress, claimed }
//   day = 邊日（本地時間 YYYY-MM-DD，過咗午夜就重新由第 1 個開始）· index = 而家做緊第幾個（0–9）
//   progress = 做咗幾多 · claimed = 第 10 個都攞咗獎（今日全部完成）

import { state, save } from './state.js';
import { ECHO_QUESTS, ECHO_QUESTS_OPEN_DATE, INDEX_NEW_SPECIES_REWARD } from './data/balance.js';
import { addGear } from './data/gears.js';
import { findAnimal, randomKg } from './data/animals.js';
import { short } from './format.js';

const openDate = () => {
  const [y, m, d] = ECHO_QUESTS_OPEN_DATE.split('-').map(Number);
  return new Date(y, m - 1, d);
};
// 開咗未：到咗日期，或者秘密控制台提早開（state.echoQuestsEarly）
export const isQuestlineOpen = (now = new Date()) => !!state.echoQuestsEarly || now >= openDate();
export const questlineOpenText = () => openDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // 「24 Oct」
// 仲有幾多日（今日 22 號、24 號開 → 2）
export function questlineDaysLeft(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((openDate() - today) / 86400000));
}
export const questlineLockText = () => {
  const n = questlineDaysLeft();
  return `🔒 Opens on ${questlineOpenText()} (${n <= 1 ? (n ? 'tomorrow' : 'today') : `in ${n} days`})`;
};

const todayKey = () => new Date().toLocaleDateString('en-CA'); // 例如 2026-10-24（本地時間）
// 午夜重新開始仲有幾耐（毫秒）
export function msToMidnight(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
}

// 確保係今日嘅進度（過咗午夜：由第 1 個重新開始）
export function questlineToday() {
  const k = todayKey();
  const s = state.echoQuests;
  if (!s || s.day !== k || !(s.index >= 0 && s.index < ECHO_QUESTS.length)) state.echoQuests = { day: k, index: 0, progress: 0, claimed: false };
  return state.echoQuests;
}
export const currentQuest = () => ECHO_QUESTS[questlineToday().index];
export const questComplete = () => {
  const s = questlineToday();
  return !s.claimed && s.progress >= ECHO_QUESTS[s.index].target;
};
export const allQuestsDone = () => questlineToday().claimed;

// 獎品 → 一行行字（面板、完成彈窗用）
export function rewardList(r) {
  const out = [];
  if (r.pet) out.push({ icon: findAnimal(r.pet)?.emoji || '🐾', text: `${r.pet} (${findAnimal(r.pet)?.rarity || 'Mythic'} pet!)`, big: true });
  if (r.chests) out.push({ icon: '🧟', text: `${r.chests} Zombified Chest${r.chests > 1 ? 's' : ''}` });
  if (r.shards) out.push({ icon: '🔮', text: `${r.shards} Halloween Shard${r.shards > 1 ? 's' : ''}` });
  if (r.candy) out.push({ icon: '🌽', text: `${short(r.candy)} Candy Corn` });
  if (r.dust) out.push({ icon: '💀', text: `${short(r.dust)} Soul Dust` });
  if (r.money) out.push({ icon: '💰', text: `$${short(r.money)}` });
  if (r.tokens) out.push({ icon: '🎟️', text: `${r.tokens} Skin Tokens` });
  return out;
}

// 俾獎
function giveReward(r) {
  if (r.candy) state.candyCorn = (state.candyCorn || 0) + r.candy;
  if (r.dust) state.soulDust = (state.soulDust || 0) + r.dust;
  if (r.shards) addGear('halloweenShard', r.shards);
  if (r.chests) addGear('zombieChest', r.chests); // 🧟 箱入背包 Gears（另一個幫手整緊開箱）
  if (r.tokens) state.tokens = (state.tokens || 0) + r.tokens;
  if (r.money) state.money += r.money;
  let indexReward = 0;
  if (r.pet) {
    const info = findAnimal(r.pet);
    const biome = info?.biome ?? 9;
    state.pets.push({ name: r.pet, biome, kg: info ? randomKg(info) : 1, rarity: info?.rarity || 'Mythic', onPlot: false });
    if (!state.indexFound.includes(r.pet)) {
      state.indexFound.push(r.pet);
      indexReward = INDEX_NEW_SPECIES_REWARD[biome] || 0;
      state.money += indexReward;
    }
  }
  return indexReward;
}

const listeners = new Set();
export const questline = {
  onChange: (f) => listeners.add(f), // f(kind: 'progress' | 'done' | 'claim', quest)
  // 有嘢發生就報：只有「而家做緊嗰個」任務會計數
  track(id, n = 1, extra = {}) {
    if (!isQuestlineOpen() || !(n > 0)) return;
    const s = questlineToday();
    const q = ECHO_QUESTS[s.index];
    if (s.claimed || q.track !== id || s.progress >= q.target) return;
    if (q.biome !== undefined && extra.biome !== q.biome) return;
    s.progress = Math.min(q.target, s.progress + n);
    save();
    const kind = s.progress >= q.target ? 'done' : 'progress';
    for (const f of listeners) f(kind, q);
  },
  // 攞獎：回傳 { quest, reward, indexReward } 或者 null（未做完）
  claim() {
    if (!questComplete()) return null;
    const s = questlineToday();
    const q = ECHO_QUESTS[s.index];
    const indexReward = giveReward(q.reward);
    if (s.index < ECHO_QUESTS.length - 1) {
      s.index += 1;
      s.progress = 0;
    } else s.claimed = true;
    save();
    for (const f of listeners) f('claim', q);
    return { quest: q, reward: q.reward, indexReward };
  },
  today: questlineToday,
  current: currentQuest,
  // 🧪 測試用（dev console：game.questline.finish() / game.questline.jump(9)）
  finish() {
    const q = currentQuest();
    questline.track(q.track, q.target - questlineToday().progress, { biome: q.biome });
  },
  jump(i) {
    const s = questlineToday();
    Object.assign(s, { index: Math.max(0, Math.min(ECHO_QUESTS.length - 1, i)), progress: 0, claimed: false });
    save();
    for (const f of listeners) f('progress', currentQuest());
  },
};
