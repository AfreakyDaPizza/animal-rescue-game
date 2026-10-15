// 每日任務（小朋友 2026-10-11）：每日 3 個，完成攞 Skin Tokens（皮膚代幣）
// 同一日大家都係同一組任務（用日期揀）；第二日自動換新

import { state, save } from './state.js';

export const QUEST_POOL = [
  { id: 'rescue', text: 'Rescue {n} animals', counts: [2, 3, 5], reward: 6 },
  { id: 'right', text: 'Answer {n} questions right', counts: [3, 5, 8], reward: 5 },
  { id: 'pets', text: 'Get {n} pets from the Reproduce Machines', counts: [1, 2, 4], reward: 6 },
  { id: 'train', text: 'Train for {n} seconds', counts: [60, 120, 240], reward: 4 },
  { id: 'upgrade', text: 'Buy {n} upgrades', counts: [1, 2, 3], reward: 5 },
  { id: 'money', text: 'Earn ${n} from your Plot', counts: [200, 1000, 5000], reward: 5 },
  { id: 'jump', text: 'Jump {n} times', counts: [20, 40, 60], reward: 3 },
];

// 你救咗／攞到寵物都有代幣（越稀有越多）
export const PET_TOKENS = { Common: 1, Rare: 2, Epic: 3, Legendary: 5, Mythic: 10 };

const todayKey = () => new Date().toLocaleDateString('en-CA'); // 例如 2026-10-11

function pickToday(key) {
  let h = 0;
  for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const pool = [...QUEST_POOL];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const q = pool.splice(h % pool.length, 1)[0];
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    const n = q.counts[h % q.counts.length];
    out.push({ id: q.id, n, progress: 0, claimed: false, reward: q.reward + Math.floor(n / q.counts[0]) });
  }
  return out;
}

// 確保而家係今日嘅任務
export function todayQuests() {
  const key = todayKey();
  // 舊任務已經冇咗（例如拉桿）：今日嘅任務重新揀過
  if (state.questDay !== key || state.quests.some((q) => !QUEST_POOL.some((p) => p.id === q.id))) {
    state.questDay = key;
    state.quests = pickToday(key);
  }
  return state.quests;
}

export const questText = (q) => QUEST_POOL.find((p) => p.id === q.id).text.replace('{n}', q.n.toLocaleString('en-US'));

// 有嘢發生（例如救咗一隻動物）就叫：questEvent('rescue', 1)；完成會回傳嗰個任務
export function questEvent(id, amount = 1) {
  const done = [];
  for (const q of todayQuests()) {
    if (q.id !== id || q.progress >= q.n) continue;
    q.progress = Math.min(q.n, q.progress + amount);
    if (q.progress >= q.n) done.push(q);
  }
  return done;
}

export function claimQuest(i) {
  const q = todayQuests()[i];
  if (!q || q.claimed || q.progress < q.n) return 0;
  q.claimed = true;
  state.tokens += q.reward;
  save();
  return q.reward;
}
