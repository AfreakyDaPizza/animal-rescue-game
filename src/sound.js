// 聲效同背景音樂：全部用 Web Audio 即場合成（唔使聲音檔）
// play('borrow') 出聲效；setMusicMood('hub') 轉音樂風格；撳 M 開／關全部聲

let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
let musicBus = null; // 所有背景音樂先經呢度（轉歌淡出淡入）
let musicPaused = false; // 睇片嗰陣暫停背景音樂
const MASTER_VOLUME = 0.9;
const MUSIC_VOLUME = 0.35;
let muted = false;
try {
  muted = localStorage.getItem('animal-rescue-muted') === '1';
} catch {
  // 冇 localStorage 都照玩
}

function ensure() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.6; // 聲效大聲啲（之前太細聲）
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicPaused ? 0 : MUSIC_VOLUME; // 背景音樂細聲啲，唔好蓋過聲效
    musicGain.connect(master);
    musicBus = ctx.createGain(); // 轉歌淡出淡入用（Halloween／Ghost World）
    musicBus.connect(musicGain);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// 一個音：頻率 freq，由 start 開始響 dur 秒；slide = 尾段滑去幾多倍頻率
function tone(freq, start, dur, { type = 'sine', vol = 0.3, slide = 1, out = null } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(out || sfxGain);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// 一嚿雜音（腳步、撞嘢、風聲）
function noise(start, dur, { vol = 0.2, freq = 1000, q = 1, type = 'lowpass' } = {}) {
  const length = Math.ceil(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(sfxGain);
  src.start(start);
}

// 幾個音一個跟一個（琶音）
const arp = (t, notes, gap, opts) => notes.forEach((f, i) => tone(f, t + i * gap, gap * 2.5, opts));

const SOUNDS = {
  click: (t) => tone(900, t, 0.05, { type: 'square', vol: 0.06 }),
  step: (t) => noise(t, 0.07, { vol: 0.12, freq: 400 }),
  blip: (t) => tone(660, t, 0.08, { type: 'triangle', vol: 0.1, slide: 1.5 }),
  borrow: (t) => arp(t, [523, 659, 784, 1047], 0.07, { type: 'triangle', vol: 0.22 }),
  rescue: (t) => {
    arp(t, [523, 659, 784], 0.1, { type: 'square', vol: 0.12 });
    tone(1047, t + 0.3, 0.6, { type: 'square', vol: 0.15 });
    tone(784, t + 0.3, 0.6, { type: 'triangle', vol: 0.15 });
  },
  coin: (t) => {
    tone(988, t, 0.08, { type: 'square', vol: 0.1 });
    tone(1319, t + 0.08, 0.3, { type: 'square', vol: 0.1 });
  },
  upgrade: (t) => arp(t, [392, 523, 659, 784, 1047, 1319], 0.06, { type: 'triangle', vol: 0.2 }),
  tierUp: (t) => {
    arp(t, [523, 659, 784, 1047, 1319, 1568, 2093], 0.07, { type: 'sine', vol: 0.22 });
    noise(t + 0.4, 0.8, { vol: 0.08, freq: 6000, type: 'highpass' }); // 閃閃聲
  },
  pop: (t) => tone(300, t, 0.15, { type: 'sine', vol: 0.3, slide: 3 }),
  ding: (t) => {
    tone(1568, t, 0.8, { vol: 0.15 });
    tone(2093, t + 0.12, 0.8, { vol: 0.12 });
  },
  right: (t) => {
    tone(784, t, 0.12, { type: 'triangle', vol: 0.25 });
    tone(1175, t + 0.12, 0.35, { type: 'triangle', vol: 0.25 });
  },
  wrong: (t) => {
    tone(220, t, 0.25, { type: 'sawtooth', vol: 0.15, slide: 0.8 });
    tone(165, t + 0.25, 0.4, { type: 'sawtooth', vol: 0.15, slide: 0.8 });
  },
  hit: (t) => {
    noise(t, 0.3, { vol: 0.35, freq: 600 });
    tone(150, t, 0.3, { type: 'square', vol: 0.15, slide: 0.5 });
  },
  alarm: (t) => {
    for (let i = 0; i < 3; i++) {
      tone(700, t + i * 0.3, 0.15, { type: 'square', vol: 0.1, slide: 1.3 });
      tone(900, t + i * 0.3 + 0.15, 0.15, { type: 'square', vol: 0.1, slide: 0.8 });
    }
  },
  boing: (t) => tone(180, t, 0.5, { type: 'sine', vol: 0.3, slide: 4 }),
  night: (t) => {
    tone(98, t, 2.5, { type: 'sine', vol: 0.3 });
    tone(147, t, 2.5, { type: 'sine', vol: 0.15 });
  },
  day: (t) => arp(t, [523, 784, 1047, 1568], 0.12, { type: 'sine', vol: 0.18 }),
  magic: (t) => {
    for (let i = 0; i < 10; i++) tone(1000 + Math.random() * 2000, t + i * 0.06, 0.3, { vol: 0.07 });
    arp(t + 0.6, [659, 831, 988, 1319], 0.1, { type: 'triangle', vol: 0.18 });
  },
  // 🎃 Halloween：行雷、鬼魂笑聲
  thunder: (t) => {
    noise(t, 0.15, { vol: 0.55, freq: 2200 });
    noise(t + 0.1, 2.6, { vol: 0.5, freq: 220 });
    tone(38, t + 0.05, 2.4, { type: 'sine', vol: 0.4, slide: 0.7 });
  },
  spooky: (t) => {
    tone(330, t, 1.2, { type: 'sine', vol: 0.12, slide: 0.6 });
    tone(415, t + 0.25, 1.4, { type: 'sine', vol: 0.1, slide: 0.55 });
  },
  rumble: (t) => {
    noise(t, 2.2, { vol: 0.45, freq: 140 });
    tone(45, t, 2.2, { type: 'sine', vol: 0.35, slide: 0.8 });
  },
  ring: (t) => {
    for (let i = 0; i < 4; i++) tone(i % 2 ? 1180 : 940, t + i * 0.12, 0.1, { type: 'square', vol: 0.06 });
    for (let i = 0; i < 4; i++) tone(i % 2 ? 1180 : 940, t + 0.8 + i * 0.12, 0.1, { type: 'square', vol: 0.06 });
  },
  engine: (t) => {
    noise(t, 3, { vol: 0.25, freq: 220 });
    tone(70, t, 3, { type: 'sawtooth', vol: 0.06, slide: 1.4 });
  },
  type: (t) => tone(1500 + Math.random() * 300, t, 0.03, { type: 'square', vol: 0.04 }),
  // 打鼓（Eternal 出現）：越打越快越大聲，最尾一下鑔
  drumroll: (t) => {
    for (let i = 0; i < 28; i++) noise(t + i * 0.055, 0.05, { vol: 0.08 + i * 0.008, freq: 250 + i * 6 });
    noise(t + 1.6, 0.9, { vol: 0.35, freq: 6000, q: 0.5, type: 'highpass' });
    tone(110, t + 1.6, 0.5, { type: 'triangle', vol: 0.3, slide: 0.6 });
  },
  // 水晶聲：高音叮叮
  crystal: (t) => {
    [1568, 2093, 2637, 3136, 2637, 3520].forEach((f, i) => tone(f, t + i * 0.08, 0.6, { type: 'sine', vol: 0.09 }));
    tone(4186, t + 0.5, 1.2, { type: 'sine', vol: 0.05 });
  },
  swoosh: (t) => noise(t, 0.25, { vol: 0.2, freq: 1500, q: 0.7, type: 'bandpass' }),
  // 敲玻璃（第一隻寵物出世動畫）：叩叩
  knock: (t) => {
    tone(1250, t, 0.07, { type: 'triangle', vol: 0.28, slide: 0.6 });
    noise(t, 0.05, { vol: 0.25, freq: 2600, q: 1.2, type: 'bandpass' });
    tone(1150, t + 0.13, 0.07, { type: 'triangle', vol: 0.24, slide: 0.6 });
    noise(t + 0.13, 0.05, { vol: 0.22, freq: 2400, q: 1.2, type: 'bandpass' });
  },
  // Issue #2：實驗室 Boss 戰
  boom: (t) => {
    noise(t, 0.7, { vol: 0.5, freq: 350 });
    tone(90, t, 0.6, { type: 'sine', vol: 0.4, slide: 0.4 });
  },
  slam: (t) => {
    noise(t, 0.45, { vol: 0.55, freq: 220 });
    tone(70, t, 0.45, { type: 'square', vol: 0.18, slide: 0.5 });
  },
  roar: (t) => {
    tone(130, t, 1.1, { type: 'sawtooth', vol: 0.16, slide: 0.6 });
    tone(97, t + 0.05, 1.1, { type: 'sawtooth', vol: 0.12, slide: 0.65 });
    noise(t, 0.9, { vol: 0.2, freq: 600 });
  },
  yawn: (t) => tone(330, t, 1.0, { type: 'triangle', vol: 0.14, slide: 0.55 }),
  portal: (t) => {
    tone(160, t, 1.4, { type: 'sawtooth', vol: 0.07, slide: 5 });
    tone(240, t + 0.1, 1.3, { type: 'sine', vol: 0.12, slide: 3 });
  },
  drone: (t) => {
    for (let i = 0; i < 6; i++) tone(210 + (i % 2) * 30, t + i * 0.12, 0.12, { type: 'sawtooth', vol: 0.04 });
  },
  poof: (t) => noise(t, 0.6, { vol: 0.25, freq: 2500, q: 0.6, type: 'bandpass' }),
  splash: (t) => { // 🎣 魚咬鈎：水花
    noise(t, 0.35, { vol: 0.35, freq: 900, q: 0.8, type: 'bandpass' });
    tone(220, t, 0.25, { type: 'sine', vol: 0.18, slide: 0.5 });
  },
  // 🎣 釣魚（Issue #8 #9）：拋竿「咻」、浮標落水「啵」、收線「嗒」、Candy Corn「叮叮」、大獎音樂
  cast: (t) => {
    noise(t, 0.3, { vol: 0.28, freq: 2200, q: 0.6, type: 'bandpass' });
    tone(900, t, 0.25, { type: 'sine', vol: 0.06, slide: 0.4 });
  },
  plop: (t) => {
    tone(420, t, 0.12, { type: 'sine', vol: 0.3, slide: 0.35 });
    noise(t + 0.02, 0.25, { vol: 0.2, freq: 1100, q: 0.9, type: 'bandpass' });
  },
  reel: (t) => {
    tone(1700 + Math.random() * 400, t, 0.035, { type: 'square', vol: 0.05 });
    noise(t, 0.04, { vol: 0.08, freq: 3500, q: 1.5, type: 'bandpass' });
  },
  candy: (t) => {
    arp(t, [1047, 1319, 1568], 0.05, { type: 'triangle', vol: 0.16 });
    tone(2093, t + 0.18, 0.3, { type: 'sine', vol: 0.08 });
  },
  bigCatch: (t) => {
    arp(t, [523, 659, 784, 1047], 0.09, { type: 'square', vol: 0.09 });
    [523, 659, 784, 1047].forEach((f) => tone(f, t + 0.45, 1.3, { type: 'triangle', vol: 0.12 }));
    arp(t + 0.5, [1568, 2093, 2637, 3136, 2637, 3136, 4186], 0.07, { type: 'sine', vol: 0.06 });
    noise(t + 0.4, 1.2, { vol: 0.12, freq: 6000, type: 'highpass' });
    tone(130, t + 0.4, 0.6, { type: 'sine', vol: 0.35, slide: 0.5 });
  },
  solar: (t) => {
    arp(t, [784, 988, 1175, 1568, 1976], 0.06, { type: 'triangle', vol: 0.2 });
    noise(t, 0.9, { vol: 0.12, freq: 5000, type: 'highpass' });
  },
  ouch: (t) => tone(500, t, 0.6, { type: 'square', vol: 0.1, slide: 0.4 }),
  zone: (t) => {
    tone(392, t, 0.4, { type: 'triangle', vol: 0.15 });
    tone(587, t + 0.15, 0.5, { type: 'triangle', vol: 0.15 });
  },
  // 🚂 Phantom Express 汽笛（兩個音，有啲走音，陰陰森森）
  whistle: (t) => {
    tone(587, t, 1.1, { type: 'sine', vol: 0.18, slide: 0.97 });
    tone(740, t, 1.1, { type: 'sine', vol: 0.12, slide: 0.96 });
    tone(587, t + 1.3, 0.7, { type: 'sine', vol: 0.15, slide: 0.9 });
    noise(t, 1.8, { vol: 0.06, freq: 3000, type: 'highpass' }); // 蒸汽
  },
  // 🧹 吸塵機（揸住嘅時候每 0.25 秒叫一次）
  vacuum: (t) => {
    noise(t, 0.3, { vol: 0.09, freq: 900, q: 0.8, type: 'bandpass' });
    tone(110, t, 0.3, { type: 'sawtooth', vol: 0.025 });
  },
  // 👻 捉到鬼：「咻」吸入去 +「啵」一聲 + 閃閃
  soulCatch: (t) => {
    noise(t, 0.3, { vol: 0.22, freq: 2400, q: 0.9, type: 'bandpass' });
    tone(220, t, 0.28, { type: 'sine', vol: 0.25, slide: 5 });
    tone(140, t + 0.28, 0.12, { type: 'square', vol: 0.12, slide: 0.4 }); // 啵
    noise(t + 0.28, 0.12, { vol: 0.3, freq: 700 });
    arp(t + 0.36, [880, 1175, 1568, 2093], 0.06, { type: 'triangle', vol: 0.14 });
  },
  // 💔 俾光球打中，跌一粒心
  heartLost: (t) => {
    tone(440, t, 0.18, { type: 'square', vol: 0.12, slide: 0.6 });
    tone(330, t + 0.16, 0.3, { type: 'square', vol: 0.1, slide: 0.5 });
    noise(t, 0.15, { vol: 0.25, freq: 500 });
  },
  // ❤️ 回返一粒心
  heartBack: (t) => arp(t, [659, 988], 0.07, { type: 'sine', vol: 0.12 }),
  // 💫 冇晒心：暈低
  knockedOut: (t) => {
    arp(t, [523, 440, 349, 262], 0.16, { type: 'triangle', vol: 0.18 });
    tone(196, t + 0.7, 0.9, { type: 'sine', vol: 0.15, slide: 0.5 });
  },
  // ☄️ METEORIC（Issue #10）：隕石「咻——」飛過天、轟一聲撞落地、遠處撞落嘅低沉隆隆聲、執到水晶「叮鈴」
  meteorWhoosh: (t) => {
    noise(t, 2.6, { vol: 0.32, freq: 700, q: 0.7, type: 'bandpass' });
    tone(1400, t, 2.4, { type: 'sine', vol: 0.05, slide: 0.25 });
    tone(90, t + 1.2, 1.6, { type: 'sawtooth', vol: 0.05, slide: 0.6 });
  },
  meteorBoom: (t) => {
    noise(t, 1.8, { vol: 0.9, freq: 420 });
    noise(t, 0.35, { vol: 0.5, freq: 2600, q: 0.5, type: 'bandpass' });
    tone(70, t, 1.4, { type: 'sine', vol: 0.6, slide: 0.45 });
    tone(140, t, 0.5, { type: 'square', vol: 0.12, slide: 0.3 });
    arp(t + 0.25, [1568, 2093, 2637], 0.08, { type: 'triangle', vol: 0.05 }); // 水晶碎「叮叮」
  },
  // 🌠 Cosmic Meteor Ranger 落地：「嘭」一聲 + 水晶「嗡」
  superLand: (t) => {
    noise(t, 0.35, { vol: 0.5, freq: 260 });
    tone(80, t, 0.4, { type: 'sine', vol: 0.45, slide: 0.45 });
    tone(1320, t + 0.03, 0.5, { type: 'triangle', vol: 0.07, slide: 0.5 });
    noise(t + 0.05, 0.4, { vol: 0.08, freq: 4000, type: 'highpass' });
  },
  meteorRumble: (t) => {
    noise(t, 1.4, { vol: 0.35, freq: 220 });
    tone(55, t, 1.2, { type: 'sine', vol: 0.25, slide: 0.6 });
  },
  crystal: (t) => {
    arp(t, [1319, 1760, 2349, 2637], 0.05, { type: 'triangle', vol: 0.16 });
    tone(3136, t + 0.2, 0.45, { type: 'sine', vol: 0.06 });
    noise(t, 0.25, { vol: 0.06, freq: 6000, type: 'highpass' });
  },
  // 🔮 Halloween Shard
  shard: (t) => {
    arp(t, [440, 523, 659, 831, 988], 0.09, { type: 'sine', vol: 0.2 });
    noise(t + 0.3, 1, { vol: 0.08, freq: 5000, type: 'highpass' });
  },
};

export function play(name) {
  if (muted) return;
  try {
    ensure();
    SOUNDS[name](ctx.currentTime);
  } catch {
    // 瀏覽器唔俾出聲就算
  }
}

// ================= 背景音樂 =================
// 每個風格：速度、四個和弦（MIDI 音高）、樂器聲
// 🎃 spooky（Halloween 世界）同 👻 ghost（Ghost World）係另一種寫法（spooky: true）：
//   2026-10-22 小朋友：「make more scary music」→ 小調／減和弦、慢慢嘅走音低音 drone、八音盒旋律、
//   低沉心跳、間中有風聲、木門「吱」聲、遠處鐘聲、悄悄話、烏鴉叫（全部即場合成，唔使聲音檔）
//   恐怖但唔嚇親小朋友：細聲、慢、冇尖叫冇突然好大聲
const MOODS = {
  hub: { bpm: 108, wave: 'triangle', chords: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]] }, // C G Am F：開心
  biome: { bpm: 124, wave: 'square', chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] }, // Am F G Em：冒險
  boss: { bpm: 156, wave: 'sawtooth', chords: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [56, 59, 64]] }, // 緊張
  night: { bpm: 76, wave: 'sine', chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]] }, // 柔和
  // 🎃 Halloween 世界：D 和聲小調（Dm、Bb、Gm、A）；八音盒搖籃曲 + 撥弦低音 + 間中貓頭鷹／木門聲／遠處鐘
  spooky: {
    spooky: true, bpm: 76, detune: 6, drone: [38, 45], droneVol: 0.028, wind: 0.018, heart: 0, boxVol: 0.15,
    chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    melody: [81, 0, 77, 0, 74, 0, 77, 76, 74, 0, 70, 0, 74, 0, 77, 0, 79, 0, 82, 0, 81, 0, 79, 77, 76, 0, 73, 0, 76, 79, 81, 0],
    extras: { owl: 0.12, creak: 0.1, bell: 0.08, whisper: 0, caw: 0 },
  },
  // 👻 Ghost World：更慢、減七和弦、低音 drone 有三全音（D + Ab）、八音盒走晒音（好似就嚟冇電）、
  //    每小節一下心跳、悄悄話、遠處鐘樓嘅鐘聲（個鐘停咗，但係間中仲會響……）、烏鴉、吱吱聲
  ghost: {
    spooky: true, bpm: 60, detune: 16, drone: [26, 38, 44], droneVol: 0.032, wind: 0.028, heart: 0.42, boxVol: 0.13, sag: true,
    chords: [[50, 53, 57], [49, 52, 55, 58], [46, 49, 53], [45, 49, 52, 58]],
    melody: [74, 0, 0, 77, 0, 76, 0, 0, 73, 0, 0, 76, 0, 74, 0, 0, 70, 0, 0, 73, 0, 74, 0, 77, 76, 0, 0, 0, 73, 0, 0, 0],
    extras: { owl: 0, creak: 0.2, bell: 0.3, whisper: 0.25, caw: 0.14 },
  },
};
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let mood = 'hub';
let musicTimer = null;
let nextNoteTime = 0;
let step = 0;
let loops = 0; // 恐怖音樂播咗幾多輪（變奏用）
const melodySteps = [0, 3, 6, 8, 10, 12, 14]; // 邊幾格有旋律
let pendingMood = null; // 淡出緊，等陣轉去呢首
let switchAt = 0;
let amb = null; // 恐怖音樂一直響住嘅 drone + 風聲
let noiseBuf = null;

function scheduleStep(time) {
  const m = MOODS[mood];
  if (m.spooky) return scheduleSpooky(time, m);
  const stepLength = 60 / m.bpm / 2; // 八分音符
  const chord = m.chords[Math.floor(step / 8) % 4];
  const out = musicBus;
  // 低音：每拍一下
  if (step % 4 === 0) tone(midi(chord[0] - 24), time, stepLength * 3.5, { type: 'triangle', vol: 0.5, out });
  // 琶音：和弦音一粒粒
  tone(midi(chord[step % 3] + 12), time, stepLength * 0.9, { type: m.wave, vol: m.wave === 'sine' ? 0.18 : 0.08, out });
  // 旋律：有規律咁跳和弦音（每個 loop 都一樣，聽落似一首歌）
  if (melodySteps.includes(step % 16)) {
    const note = chord[(step * 7 + Math.floor(step / 16)) % 3] + 24;
    tone(midi(note), time, stepLength * 1.8, { type: 'triangle', vol: 0.12, out });
  }
  // 鼓（非夜晚）：每拍一下輕輕嘅 hi-hat
  if (mood !== 'night' && step % 2 === 0) {
    const len = Math.ceil(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = mood === 'boss' ? 0.25 : 0.12;
    src.connect(filter).connect(g).connect(out);
    src.start(time);
  }
  step = (step + 1) % 32;
  return stepLength;
}

// ---------- 🎃👻 恐怖音樂嘅樂器（全部接去 musicBus）----------
const cents = (c) => 2 ** (c / 1200);
function getNoise() {
  if (!noiseBuf) {
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
// 一個 gain（可以擺左／右聲道）接去 musicBus；過咗 life 秒自動拆走
function outGain(vol, pan = 0, life = 8) {
  const g = ctx.createGain();
  g.gain.value = vol;
  let p = null;
  if (pan && ctx.createStereoPanner) {
    p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(musicBus);
  } else g.connect(musicBus);
  setTimeout(() => {
    g.disconnect();
    p?.disconnect();
  }, life * 1000);
  return g;
}
// 八音盒：清脆嘅鐵片聲（基音 + 高八度 + 好短嘅「叮」），慢慢收細；走音少少（舊八音盒）
function musicBox(freq, t, vol, detune, sag) {
  const f = freq * cents((Math.random() - 0.5) * 2 * detune);
  const g = outGain(1, (Math.random() - 0.5) * 0.4);
  for (const [mul, v, dur] of [[1, vol, 1.8], [2.01, vol * 0.28, 0.9], [4.2, vol * 0.12, 0.12]]) {
    const o = ctx.createOscillator();
    const e = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mul, t);
    if (sag) o.frequency.exponentialRampToValueAtTime(f * mul * 0.985, t + dur); // 走晒音，好似就嚟冇電
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(v, t + 0.006);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
// 柔和和弦墊底（慢慢淡入淡出，冇「叮」一聲）
function pad(freq, t, dur, vol) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * cents(9); // 少少走音 → 陰陰森森
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  e.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(e);
  o2.connect(e);
  e.connect(musicBus);
  for (const x of [o, o2]) {
    x.start(t);
    x.stop(t + dur + 0.05);
  }
}
// 心跳：「咚—咚」好低沉
function heartbeat(t, vol) {
  for (const [dt, k] of [[0, 1], [0.26, 0.7]]) {
    const o = ctx.createOscillator();
    const e = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(62, t + dt);
    o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.22);
    e.gain.setValueAtTime(0.0001, t + dt);
    e.gain.exponentialRampToValueAtTime(vol * k, t + dt + 0.015);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.3);
    o.connect(e).connect(musicBus);
    o.start(t + dt);
    o.stop(t + dt + 0.35);
  }
}
// 悄悄話：好似有人細細聲講嘢（得氣聲、冇字），喺左或者右邊
function whisper(t) {
  const dur = 1.4 + Math.random() * 0.8;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  src.loop = true;
  let node = src;
  for (const [type, freq, q] of [['highpass', 400, 0.7], ['peaking', 700 + Math.random() * 500, 4], ['bandpass', 1900 + Math.random() * 700, 2.5]]) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (type === 'peaking') f.gain.value = 12;
    node.connect(f);
    node = f;
  }
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, t);
  const n = 3 + Math.floor(Math.random() * 3); // 幾個「音節」
  for (let i = 0; i < n; i++) {
    const x = t + (dur / n) * i, len = dur / n;
    e.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.4, x + len * 0.3);
    e.gain.linearRampToValueAtTime(0.05, x + len * 0.9);
  }
  e.gain.linearRampToValueAtTime(0, t + dur);
  node.connect(e).connect(outGain(0.07, Math.random() < 0.5 ? -0.7 : 0.7));
  src.start(t, Math.random());
  src.stop(t + dur + 0.1);
}
// 舊木門／木地板「吱——」
function creak(t) {
  const dur = 0.7 + Math.random() * 0.6;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(14 + Math.random() * 8, t); // 好低頻嘅鋸齒波 = 一粒粒「嗒嗒嗒」
  o.frequency.linearRampToValueAtTime(30 + Math.random() * 20, t + dur * 0.6);
  o.frequency.linearRampToValueAtTime(18, t + dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900 + Math.random() * 500, t);
  bp.frequency.linearRampToValueAtTime(1300 + Math.random() * 400, t + dur);
  bp.Q.value = 6;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(1, t + 0.08);
  e.gain.setValueAtTime(1, t + dur * 0.7);
  e.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(bp).connect(e).connect(outGain(0.09, (Math.random() - 0.5) * 1.2));
  o.start(t);
  o.stop(t + dur + 0.05);
}
// 遠處嘅鐘（教堂鐘樓）：唔和諧嘅泛音、好長嘅尾音、過濾咗（聽落好遠）
function bell(t, freq, vol) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  lp.connect(outGain(1, (Math.random() - 0.5) * 0.6, 12));
  for (const [mul, v, dur] of [[0.5, 0.5, 6], [1, 1, 4.5], [1.19, 0.5, 3.5], [1.5, 0.35, 3], [2, 0.3, 2.5], [2.74, 0.18, 1.6]]) {
    const o = ctx.createOscillator();
    const e = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(vol * v, t + 0.02);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
// 貓頭鷹「呼—呼」（Halloween 世界）
function owl(t) {
  for (const [dt, len] of [[0, 0.35], [0.5, 0.6]]) {
    const o = ctx.createOscillator();
    const e = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(440, t + dt);
    o.frequency.linearRampToValueAtTime(395, t + dt + len);
    e.gain.setValueAtTime(0, t + dt);
    e.gain.linearRampToValueAtTime(0.06, t + dt + 0.08);
    e.gain.linearRampToValueAtTime(0, t + dt + len);
    o.connect(e).connect(musicBus);
    o.start(t + dt);
    o.stop(t + dt + len + 0.05);
  }
}
// 遠處烏鴉「呀——呀」
function caw(t) {
  const n = 2 + Math.floor(Math.random() * 2);
  const out = outGain(0.05, (Math.random() - 0.5) * 1.4);
  for (let i = 0; i < n; i++) {
    const s = t + i * 0.42;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(560, s);
    o.frequency.exponentialRampToValueAtTime(410, s + 0.24);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1300;
    bp.Q.value = 2.5;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, s);
    e.gain.exponentialRampToValueAtTime(1, s + 0.03);
    e.gain.exponentialRampToValueAtTime(0.0001, s + 0.26);
    o.connect(bp).connect(e).connect(out);
    o.start(s);
    o.stop(s + 0.3);
  }
}

function scheduleSpooky(time, m) {
  const stepLength = 60 / m.bpm / 2; // 八分音符
  const bar = Math.floor(step / 8);
  const chord = m.chords[bar % 4];
  // 每小節頭：和弦墊底 + 心跳 + 隨機嘅環境聲
  if (step % 8 === 0) {
    chord.forEach((n) => pad(midi(n), time, stepLength * 8.5, 0.035));
    if (m.heart) heartbeat(time, m.heart);
    const x = m.extras;
    const later = time + stepLength * (2 + Math.random() * 4); // 唔好同拍子撞埋
    if (Math.random() < x.creak) creak(later);
    if (Math.random() < x.whisper) whisper(later + 0.3);
    if (Math.random() < x.caw) caw(later + 0.6);
    if (Math.random() < x.owl) owl(later);
    if (bar === 0 && Math.random() < x.bell * 3) bell(time + 0.05, midi(m.chords[0][0] - 12), 0.06);
    else if (Math.random() < x.bell * 0.3) bell(later, midi(m.chords[0][0] - 5), 0.04);
  }
  // 低音：撥弦咁，第 1、3 拍（Halloween）；Ghost World 淨係心跳之後一下
  if (step % 4 === 0 && (!m.heart || step % 8 === 0)) tone(midi(chord[0] - 12), time + (m.heart ? 0.6 : 0), stepLength * 1.6, { type: 'triangle', vol: 0.22, out: musicBus });
  // 八音盒旋律：Halloween 每 4 輪有一輪高八度；Ghost World 每 3 輪有一輪「走晒音」
  const note = m.melody[step];
  if (note) {
    const up = loops % 4 === 3 && !m.heart ? 12 : 0;
    const skip = loops % 2 === 1 && Math.random() < 0.2; // 間中漏一粒（似舊八音盒）
    if (!skip) musicBox(midi(note + up), time, m.boxVol, m.detune, m.sag && loops % 3 === 2);
  }
  // Halloween：輕輕嘅「嗒」保持節奏；Ghost World 冇
  if (!m.heart && step % 4 === 2) tone(midi(note ? 62 : 57), time, 0.08, { type: 'square', vol: 0.025, out: musicBus });
  step = (step + 1) % 32;
  if (step === 0) loops++;
  return stepLength;
}

// 一直響住嘅 drone（幾個走咗少少音嘅鋸齒波，過低通濾波器，慢慢郁）+ 風聲
function startAmbience(name) {
  const m = MOODS[name];
  if (!m?.spooky || amb) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + 4);
  gain.connect(musicBus);
  const nodes = [];
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.Q.value = 3;
  const dg = ctx.createGain();
  dg.gain.value = m.droneVol;
  lp.connect(dg).connect(gain);
  m.drone.forEach((n, i) => {
    for (const c of [-9, 7]) {
      const o = ctx.createOscillator();
      o.type = n < 30 ? 'sine' : 'sawtooth';
      o.frequency.value = midi(n) * cents(c + i * 2);
      o.connect(lp);
      nodes.push(o);
    }
  });
  const lfo = ctx.createOscillator(); // 濾波器慢慢開合（好似喘氣）
  lfo.frequency.value = 0.06;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 160;
  lfo.connect(lfoG).connect(lp.frequency);
  nodes.push(lfo);
  // 風：雜音 → 帶通（頻率慢慢郁）→ 一陣陣
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 450;
  bp.Q.value = 0.8;
  const wg = ctx.createGain();
  wg.gain.value = m.wind;
  const wl = ctx.createOscillator();
  wl.frequency.value = 0.045;
  const wlg = ctx.createGain();
  wlg.gain.value = 260;
  wl.connect(wlg).connect(bp.frequency);
  const gust = ctx.createOscillator();
  gust.frequency.value = 0.09;
  const gustG = ctx.createGain();
  gustG.gain.value = m.wind * 0.8;
  gust.connect(gustG).connect(wg.gain);
  src.connect(bp).connect(wg).connect(gain);
  nodes.push(src, wl, gust);
  nodes.forEach((n) => n.start(now));
  amb = { gain, nodes };
}
function stopAmbience() {
  if (!amb) return;
  const { gain, nodes } = amb;
  amb = null;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.8);
  nodes.forEach((n) => n.stop(now + 1));
  setTimeout(() => gain.disconnect(), 1500);
}
function fadeBus(v, tc) {
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.setTargetAtTime(v, now, tc);
}

function startMusic() {
  if (musicTimer) return;
  nextNoteTime = ctx.currentTime + 0.1;
  // 每 50 毫秒睇一次，預先排定之後 0.2 秒嘅音（咁樣節奏先穩定）
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    try {
      // 轉歌：舊嗰首淡出咗 → 換新歌、淡入
      if (pendingMood && ctx.currentTime >= switchAt) {
        stopAmbience();
        mood = pendingMood;
        pendingMood = null;
        step = 0;
        loops = 0;
        nextNoteTime = Math.max(nextNoteTime, ctx.currentTime + 0.05);
        fadeBus(1, 0.5);
      }
      if (MOODS[mood].spooky && !amb) startAmbience(mood);
      while (nextNoteTime < ctx.currentTime + 0.2) nextNoteTime += scheduleStep(nextNoteTime);
    } catch {
      // 瀏覽器唔俾就算
    }
  }, 50);
}

// 轉音樂風格：'hub'、'biome'、'boss'、'night'、'spooky'（🎃 Halloween）、'ghost'（👻 Ghost World）
// 普通世界之間照舊即刻轉；入／出 Halloween 世界、Ghost World 就慢慢淡出再淡入（約 1 秒）
export function setMusicMood(newMood) {
  if (!MOODS[newMood] || newMood === (pendingMood ?? mood)) return;
  if (!ctx || !musicBus) {
    mood = newMood;
    step = 0;
    loops = 0;
    return;
  }
  if (newMood === mood) { // 淡出緊又改返主意：唔轉，淡返入嚟
    pendingMood = null;
    fadeBus(1, 0.3);
    return;
  }
  if (!MOODS[newMood].spooky && !MOODS[mood].spooky) {
    if (pendingMood) fadeBus(1, 0.3);
    pendingMood = null;
    mood = newMood;
    step = 0;
    return;
  }
  pendingMood = newMood;
  switchAt = ctx.currentTime + 1.1;
  fadeBus(0, 0.3);
}

// 測試用（dev console）：而家播緊邊首、有冇 drone
export const musicDebug = () => ({ mood, pendingMood, ambience: !!amb, bus: musicBus?.gain.value, ctx: ctx?.state });

// 第一次撳「Click to Play」時叫：瀏覽器要撳過嘢先俾出聲，順便開始播音樂
export function unlockAudio() {
  try {
    ensure();
    startMusic();
  } catch {
    // 唔得就算
  }
}

export const isMuted = () => muted;
// 喺跑步機睇片：背景音樂慢慢靜晒，走咗再慢慢返嚟（聲效照響）
export function setMusicPaused(paused) {
  if (paused === musicPaused) return;
  musicPaused = paused;
  if (!ctx || !musicGain) return;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(paused ? 0 : MUSIC_VOLUME, now + 0.8);
}
export const isMusicPaused = () => musicPaused;
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  try {
    localStorage.setItem('animal-rescue-muted', muted ? '1' : '0');
  } catch {
    // 記唔到就算
  }
  return muted;
}

// ================= 🧹 Ghost Vacuum 持續嘅吸塵聲 =================
// vacuumHum(on, strain)：每格叫；on = 吸緊；strain 0→1 = 吸緊嗰隻鬼幾接近捉到（越高越尖聲）
let hum = null;
export function vacuumHum(on, strain = 0) {
  if (!ctx && !on) return;
  try {
    ensure();
    if (!hum) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.value = 700;
      const motor = ctx.createOscillator();
      motor.type = 'sawtooth';
      motor.frequency.value = 95;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const wobble = ctx.createOscillator(); // 「嗚嗚」聲
      wobble.frequency.value = 7;
      const wobbleGain = ctx.createGain();
      wobbleGain.gain.value = 8;
      wobble.connect(wobbleGain).connect(motor.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const motorGain = ctx.createGain();
      motorGain.gain.value = 0.35;
      src.connect(bp).connect(gain);
      motor.connect(lp).connect(motorGain).connect(gain);
      gain.connect(sfxGain);
      src.start();
      motor.start();
      wobble.start();
      hum = { gain, bp, motor, lp };
    }
    const now = ctx.currentTime;
    const k = Math.max(0, Math.min(1, strain));
    hum.gain.gain.setTargetAtTime(on && !muted ? 0.09 + k * 0.05 : 0, now, on ? 0.05 : 0.12);
    hum.bp.frequency.setTargetAtTime(650 + k * 2200, now, 0.08);
    hum.motor.frequency.setTargetAtTime(90 + k * 160, now, 0.08);
    hum.lp.frequency.setTargetAtTime(450 + k * 900, now, 0.08);
  } catch {
    // 瀏覽器唔俾出聲就算
  }
}
