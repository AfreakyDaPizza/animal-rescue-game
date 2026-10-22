// 玩家嘅數值（Speed、IQ、錢、寵物…），自動存喺瀏覽器，關咗再開都記得

export const SAVE_KEY = 'animal-rescue-save-v1';

const DEFAULTS = {
  device: null, // 'mobile' 或者 'pc'：開場動畫之後揀一次（小朋友 2026-10-17）
  speed: 100,
  iq: 100,
  money: 0,
  pets: [],      // 已經得到嘅寵物（第 5 步開始有）
  borrowed: [],  // 借返嚟、等緊入繁殖機嘅動物
  rescued: 0,    // 總共救咗幾多隻
  indexFound: [], // 圖鑑登記咗嘅動物名（第 8 步）
  treadmillLevel: 1,
  tableLevel: 1,
  machineLevel: 1, // 繁殖機等級（1 Basic、2 Nature Growth、3 Mountain Magic）
  tokens: 0, // Skin Tokens（做任務、攞寵物得到）
  quests: [],
  questDay: '',
  rangerSkin: 'ranger',
  petSkin: 'none',
  ownedRanger: ['ranger'],
  ownedPet: ['none'],
  hubLevel: 0, // Hub 擴建咗幾多次（每次深 10 米 + 一個新區域）
  takenSpawns: [], // 救咗嘅動物身份（F5 唔再出）
  tutorialStep: 0,
  tutorialDone: false,
  plotLevel: 0, // 地塊升咗幾多次（每次 +1 隻位）
  machines: [null, null, null, null, null], // 5 部繁殖機：{ name, biome, endsAt }
  labUnlocked: false, // Issue #2：撳咗秘密紅色掣，睇咗開門動畫
  hasHammer: false, // 執咗 Biome 6 山後面嘅鎚仔（永遠喺快捷欄）
  labPodsSmashed: [], // 打爛咗邊幾個玻璃艙（0–3）
  labLegendaryGiven: 0, // 交咗幾多隻 Legendary 俾傳送門
  labGivenSpecies: [], // 交咗邊幾種（結局動畫佢哋會返嚟）
  labVisited: false, // 行入過實驗室（之後唔再指路）
  bigButton: false, // 撳咗橋下面個紅掣（開 Fuse Machine 同新生態區）
  fuseNerfed: false, // 舊 Fuse 寵物已經減咗錢（2026-10-18 Fuse nerf）
  firstHatchSeen: false, // 睇咗第一隻寵物出世動畫（敲玻璃、爆、跳圈圈）
  kingdomSeen: false, // 睇咗 Biome 7 開門動畫
  collabSeen: false, // 睇咗秘密結局 THE COLLAB
  labBossDefeated: false, // 打贏咗 Mutated Scientist Poacher
  labRewardPaid: false, // Owner 俾咗 $1000 未
  labEndingSeen: false, // 睇咗結局動畫未（實驗室爆炸、見到 Gym）
  beachFinaleSeen: null, // 去過秘密沙灘睇 Owner 俾錢嗰段未（null = 舊存檔，跟 labEndingSeen）
  crazyReadyAt: 0, // 🤪 秘密沙灘個瘋狂寵物掣幾時再撳得（毫秒）
  gymEarly: false, // 🔐 秘密控制台：提早開 Gym
  soulDust: 0, // 💀 Halloween：捉鬼得嘅 Soul Dust
  hwShards: 0, // 🔮 Halloween Shard（可以疊）
  vacuumLevel: 0, // 🧹 Ghost Vacuum 等級（0 = 未有，1–5）
  hwEggs: [], // 🥚 Halloween 蛋（救返嚟、未放落蛋墳場）：{ name, rarity }
  hwSlots: [null, null, null, null, null, null, null, null], // 🪦 蛋墳場 8 個位：{ name, rarity, start } 或者 null
  halloweenEarly: false, // 🔐 秘密控制台：提早開 Halloween 世界（小朋友 2026-10-19）
  adminUsed: false, // 🔐 用過秘密控制台改嘢（已經備份咗真存檔）
  jumpPower: 0, // 💪 Gym 彈床練出嚟（每點跳高啲）
  rod: 0, // 🎣 你最好嗰支魚竿（FISHING_RODS 第幾支）；Twig Rod (0) 免費，用 Candy Corn 升級，會存低（Issue #8 #9）
  gears: [], // ⚙️ Gears（Issue #10）：[{ type: 'halloweenShard' }, { type: 'meteoricShard' }…]，種類見 src/data/gears.js
  hotbar: [null, null, null, null, null, null, null, null, null, null], // 🎒 由背包拖落快捷欄嘅嘢：每格一個 key（'pet:uid'、'res:uid'、'gear:type'）或者 null
  candyCorn: 0, // 🌽 Halloween：釣魚得嘅 Candy Corn（買魚竿、寶箱舖用）
  echoQuests: null, // 🐾 Echo's Questline（2026-10-22）：{ day, index, progress, claimed }，每日午夜重新由第 1 個開始
  echoQuestsEarly: false, // 🔐 秘密控制台：提早開 Echo's Questline
  weapons: [], // 🔫 有咗嘅魔法武器 id（src/data/weapons.js），例如 ['soulBlaster']
  reaperBeatenAt: 0, // 🐉 喺邊一場（開始時間，毫秒）打贏咗 Pumpkin Reaper Dragon（同一場唔可以再打）
  skeleTokens: 0, // ☠️ Skele Tokens：🧙 Witch Tower 獎品貨幣（Issue #11；俾獎用 src/demonicRewards.js）
  demonicBossSkin: false, // 😈 Demonic Boss Skin 解鎖咗未（Witch Tower 獎品；之後喺 Boss 隔籬撳 E 換，demonicBossSkin.js）
  meteorCrystals: 0, // ☄️ METEORIC 活動執到嘅 Meteoric Crystals（Issue #10；每粒 × state.crystalMultiplier）
  soulCandy: 0, // 🍬 Soul Candy（Issue #11）：每打贏一次 Pumpkin Reaper Dragon 得 1 粒；5 粒開 Halloween World 2（Hell）
  world2Unlocked: false, // 🔥 喺 World Expedition 地圖用 5 粒 Soul Candy 開咗 Hell 未
  witchMet: false, // 🧙‍♀️ 同 Witch Castle 個女巫傾過偈未（傾完先開到 Witch Tower 道門）
  towerBest: 0, // 🗼 Endless Witch Tower：最高打到第幾層（打完咗嘅層數）
  towerBestByMode: { easy: 0, medium: 0, hard: 0 }, // 🗼 每個難度（Issue #12）最高層數
  towerStats: { runs: 0, zombies: 0, cured: 0 }, // 🗼 總共：玩咗幾多次、打散咗幾多隻殭屍、救返幾多隻動物
};

export const state = load();

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { ...DEFAULTS };
  }
  try {
    const saved = JSON.parse(raw);
    const s = { ...DEFAULTS, ...saved };
    if (s.beachFinaleSeen === null) s.beachFinaleSeen = !!s.labEndingSeen; // 舊存檔：以前睇完結局就已經去咗沙灘
    return s;
  } catch {
    // 存檔壞咗：唔好就咁覆蓋，原封不動抄一份去 -broken，等可以救返（小朋友 2026-10-22 唔見咗啲嘢）
    try {
      if (raw) localStorage.setItem(`${SAVE_KEY}-broken-${Date.now()}`, raw);
    } catch {
      // 抄唔到就算
    }
    return { ...DEFAULTS };
  }
}

// ---- 💾 自動存檔（小朋友 2026-10-22：「得到好嘢就自動存，因為我唔見晒啲嘢」）----
// - 每秒睇一次：有改過就即刻存（唔使等 5 秒）；熄視窗／轉 tab／手機收埋都即刻存
// - 得到新寵物、新 Gear、新物種：右下角閃「💾 Saved!」
// - 自動備份：每 10 分鐘留一份，最多 5 份（AUTO_KEY），控制面板 Safety 分頁可以揀一份返去
export const AUTO_KEY = `${SAVE_KEY}-auto`;
const AUTO_EVERY = 10 * 60 * 1000;
const AUTO_KEEP = 5;
let lastJson = '';
let lastGood = null;
export const saveStatus = { failed: false };
const goodCount = () => ({ pets: state.pets?.length || 0, gears: state.gears?.length || 0, index: state.indexFound?.length || 0 });

let frozen = false; // 返去自動備份之後：唔好再存（就嚟重新載入），免得舊嘢蓋返過去

export function save() {
  if (frozen) return;
  state.savedAt = Date.now(); // 帳號系統（account.js）比較雲端同本機邊份新
  const json = JSON.stringify(state);
  const changed = json.replace(/"savedAt":\d+/, '') !== lastJson.replace(/"savedAt":\d+/, '');
  try {
    if (changed) localStorage.setItem(SAVE_KEY, json);
    lastJson = json;
    if (saveStatus.failed) window.dispatchEvent(new CustomEvent('game-save', { detail: { ok: true } }));
    saveStatus.failed = false;
  } catch {
    // 瀏覽器唔俾存（無痕模式、冇晒位）：照玩，但話俾玩家知
    if (!saveStatus.failed) window.dispatchEvent(new CustomEvent('game-save', { detail: { ok: false } }));
    saveStatus.failed = true;
    return;
  }
  const now = goodCount();
  if (lastGood && (now.pets > lastGood.pets || now.gears > lastGood.gears || now.index > lastGood.index)) window.dispatchEvent(new CustomEvent('game-save', { detail: { ok: true, good: true } }));
  lastGood = now;
  autoBackup(json);
}

// 自動備份：太耐冇備份就加一份；舊嘅最多留 AUTO_KEEP 份
export function autoBackups() {
  try {
    return JSON.parse(localStorage.getItem(AUTO_KEY)) || [];
  } catch {
    return [];
  }
}
function autoBackup(json) {
  const list = autoBackups();
  if (list.length && Date.now() - list[0].at < AUTO_EVERY) return;
  // 新開嘅空存檔唔使備份（免得將有料嘅備份擠走）
  if (!(state.pets?.length || state.money > 0 || state.rescued > 0)) return;
  list.unshift({ at: Date.now(), money: state.money || 0, pets: state.pets?.length || 0, rescued: state.rescued || 0, json });
  while (list.length > AUTO_KEEP) list.pop();
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(list));
  } catch {
    // 冇位就少留一份
    list.pop();
    try {
      localStorage.setItem(AUTO_KEY, JSON.stringify(list));
    } catch {
      // 算數
    }
  }
}
// 揀一份自動備份返去（覆蓋而家嘅存檔；返去之前先將而家嘅加入備份，唔會再唔見）
export function restoreAutoBackup(at) {
  const b = autoBackups().find((x) => x.at === at);
  if (!b) return false;
  const list = autoBackups();
  list.unshift({ at: Date.now(), money: state.money || 0, pets: state.pets?.length || 0, rescued: state.rescued || 0, json: JSON.stringify(state) });
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(list.slice(0, AUTO_KEEP + 1)));
    localStorage.setItem(SAVE_KEY, b.json);
  } catch {
    return false;
  }
  frozen = true;
  return true;
}

setInterval(save, 1000);
window.addEventListener('beforeunload', save);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
