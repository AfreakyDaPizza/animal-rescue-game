// 玩家嘅數值（Speed、IQ、錢、寵物…），自動存喺瀏覽器，關咗再開都記得

const SAVE_KEY = 'animal-rescue-save-v1';

const DEFAULTS = {
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
  leverReadyAt: 0, // 秘密拉桿幾時再拉得（真實時間 ms）
  tutorialStep: 0,
  tutorialDone: false,
  plotLevel: 0, // 地塊升咗幾多次（每次 +1 隻位）
  machines: [null, null, null, null, null], // 5 部繁殖機：{ name, biome, endsAt }
};

export const state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // 瀏覽器唔俾存（例如無痕模式）都照玩得，只係唔記得進度
  }
}

// 每 5 秒自動存一次，關視窗嗰下都存
setInterval(save, 5000);
window.addEventListener('beforeunload', save);
