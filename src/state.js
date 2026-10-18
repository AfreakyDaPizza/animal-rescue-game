// 玩家嘅數值（Speed、IQ、錢、寵物…），自動存喺瀏覽器，關咗再開都記得

const SAVE_KEY = 'animal-rescue-save-v1';

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
  kingdomSeen: false, // 睇咗 Biome 7 開門動畫
  collabSeen: false, // 睇咗秘密結局 THE COLLAB
  labBossDefeated: false, // 打贏咗 Mutated Scientist Poacher
  labRewardPaid: false, // Owner 俾咗 $1000 未
  labEndingSeen: false, // 睇咗結局動畫未
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
