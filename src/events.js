// 隨機活動：跟真實時鐘，每 15 分鐘（:00、:15、:30、:45）開始一個（小朋友 2026-10-11；Issue #9 2026-10-21 由 30 分鐘改 15 分鐘）
// 每次揀邊個活動係「固定隨機」：同一個時段，邊部電腦玩都係同一個活動

import { METEOR_OPEN_DATE } from './data/balance.js';
const SLOT_MS = 15 * 60 * 1000;

export const EVENTS = [
  { id: 'giant', emoji: '🦣', name: 'GIANT PETS', desc: 'Wild animals are 3x BIGGER! New ones every 30 seconds', duration: 300 },
  { id: 'rare', emoji: '✨', name: 'RARE RUSH', desc: 'Only Legendary & Mythic animals spawn - hurry!', duration: 30 },
  { id: 'frenzy', emoji: '💰', name: 'PET FRENZY', desc: 'All pets on your Plot earn 10x money!', duration: 300 },
  { id: 'training', emoji: '🏋️', name: 'TRAINING NO MERCY', desc: 'Treadmill & Student Table give 100x!', duration: 60 }, // Issue #9：20 秒 → 60 秒
  // 小朋友 2026-10-17：Troll Frenzy（好稀有嘅寵物，但 Boss 快 1,000,000 倍）同 Eclipse（日蝕：繁殖機 x20、日蝕激光）
  { id: 'troll', emoji: '🤡', name: 'TROLL FRENZY', desc: 'CRAZY rare pets everywhere... but every Boss is 1,000,000x FASTER! Good luck! 🤡', duration: 60 },
  // 小朋友 2026-10-18：刪走 Eclipse 活動（已經有 🌑 Eclipse 變異嘅寵物照樣保留 x6）
  // Issue #10 小朋友 2026-10-21：METEORIC（隕石雨）—— 比其他活動少啲機會（大約每 6–7 次一次），見 eventForSlot
  { id: 'meteor', emoji: '☄️', name: 'METEORIC', desc: 'Blue meteors crashed! Grab the glowing ☄️ Meteoric Crystals!', duration: 300 },
  // { id: 'eclipse', emoji: '🌑', name: 'ECLIPSE', desc: 'Reproduce Machines are 20x faster! Eclipse lasers give pets the 🌑 ECLIPSE mutation (x6 money)... but don\'t get hit!', duration: 180 },
];
// （秘密拉桿同 BIG PET FRENZY：2026-10-15 小朋友叫刪走）

// 而家生效嘅加成（其他檔案讀呢度）
export const boost = { size: 1, money: 1, train: 1, bossSpeed: 1, machine: 1, eclipse: false, meteor: false };

// 測試用：game.forceEvent('frenzy') 即刻開始一個活動
let forced = null;
export function forceEvent(id) {
  forced = { ev: EVENTS.find((e) => e.id === id), start: Date.now() };
}

// ☄️ METEORIC：另外擲一次「固定隨機」骰仔（18%，上一格係 METEORIC 就唔會再嚟）→ 實際大約 15%（每 6–7 個時段一次）
// 其他 5 個活動：同以前一樣嘅揀法（所以以前嘅時間表冇變，只係有啲時段變咗 METEORIC）
export const METEOR_CHANCE = 0.18;
function meteorRoll(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// 開放日（METEOR_OPEN_DATE，本地時間）之前嘅時段唔會有 METEORIC（小朋友 2026-10-22）
const slotOpen = (slot) => new Date(slot * SLOT_MS).toLocaleDateString('en-CA') >= METEOR_OPEN_DATE;
const isMeteorSlot = (slot) => slotOpen(slot) && meteorRoll(slot) < METEOR_CHANCE && !(slotOpen(slot - 1) && meteorRoll(slot - 1) < METEOR_CHANCE);
function eventForSlot(slot) {
  if (isMeteorSlot(slot)) return EVENTS.find((e) => e.id === 'meteor');
  const others = EVENTS.filter((e) => e.id !== 'meteor');
  const pick = (n) => ((Math.imul(n, 2654435761) >>> 0) >>> 7) % others.length;
  let i = pick(slot);
  if (i === pick(slot - 1)) i = (i + 1) % others.length; // 唔好連續兩次一樣
  return others[i];
}

// 而家嘅活動狀態：{ ev, active, left（仲有幾多秒）, next（下一個幾耐之後）, nextAt（下一個幾點開始）}
export function eventStatus(now = Date.now()) {
  if (forced) {
    const into = (now - forced.start) / 1000;
    if (into < forced.ev.duration) return { ev: forced.ev, active: true, left: forced.ev.duration - into, next: 0, key: `forced${forced.start}`, into };
    forced = null;
  }
  const slot = Math.floor(now / SLOT_MS);
  const into = (now % SLOT_MS) / 1000;
  const ev = eventForSlot(slot);
  const active = into < ev.duration;
  return { ev, active, left: ev.duration - into, next: SLOT_MS / 1000 - into, nextAt: new Date((slot + 1) * SLOT_MS), key: `slot${slot}`, into };
}

// 每格畫面叫：回傳變化 { started, ended, tick }（tick = Giant Pets 每 30 秒換一批）
let lastKey = null;
let lastActive = false;
let lastTick = -1;
export function updateEvents() {
  const s = eventStatus();
  const out = { status: s, started: null, ended: null, tick: false, tickNo: Math.floor(s.into / 30) };
  const activeKey = s.active ? s.key : null;
  if (lastActive && lastKey !== activeKey) out.ended = lastKey;
  if (activeKey && activeKey !== lastKey) {
    out.started = s.ev;
    lastTick = Math.floor(s.into / 30);
  }
  lastKey = activeKey;
  lastActive = !!activeKey;

  boost.size = !s.active ? 1 : s.ev.id === 'giant' ? 3 : 1; // Giant ×3
  boost.money = s.active && s.ev.id === 'frenzy' ? 10 : 1;
  boost.train = s.active && s.ev.id === 'training' ? 100 : 1;
  boost.bossSpeed = s.active && s.ev.id === 'troll' ? 1000000 : 1; // Troll Frenzy：Boss Speed ×1,000,000
  boost.machine = s.active && s.ev.id === 'eclipse' ? 20 : 1; // Eclipse：繁殖機 ×20
  boost.eclipse = s.active && s.ev.id === 'eclipse';
  boost.meteor = s.active && s.ev.id === 'meteor'; // ☄️ METEORIC（meteorEvent.js）
  if (s.active && s.ev.id === 'giant' && !out.started) {
    const tick = Math.floor(s.into / 30);
    if (tick !== lastTick) {
      lastTick = tick;
      out.tick = true;
    }
  }
  return out;
}
