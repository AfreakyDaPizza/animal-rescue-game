// 聲效同背景音樂：全部用 Web Audio 即場合成（唔使聲音檔）
// play('borrow') 出聲效；setMusicMood('hub') 轉音樂風格；撳 M 開／關全部聲

let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
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
  solar: (t) => {
    arp(t, [784, 988, 1175, 1568, 1976], 0.06, { type: 'triangle', vol: 0.2 });
    noise(t, 0.9, { vol: 0.12, freq: 5000, type: 'highpass' });
  },
  ouch: (t) => tone(500, t, 0.6, { type: 'square', vol: 0.1, slide: 0.4 }),
  zone: (t) => {
    tone(392, t, 0.4, { type: 'triangle', vol: 0.15 });
    tone(587, t + 0.15, 0.5, { type: 'triangle', vol: 0.15 });
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
const MOODS = {
  hub: { bpm: 108, wave: 'triangle', chords: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]] }, // C G Am F：開心
  biome: { bpm: 124, wave: 'square', chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] }, // Am F G Em：冒險
  boss: { bpm: 156, wave: 'sawtooth', chords: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [56, 59, 64]] }, // 緊張
  night: { bpm: 76, wave: 'sine', chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]] }, // 柔和
  spooky: { bpm: 82, wave: 'sine', chords: [[50, 53, 57], [51, 54, 57], [49, 52, 56], [50, 53, 56]] }, // 🎃 Halloween：Dm、減和弦、陰森
};
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let mood = 'hub';
let musicTimer = null;
let nextNoteTime = 0;
let step = 0;
const melodySteps = [0, 3, 6, 8, 10, 12, 14]; // 邊幾格有旋律

function scheduleStep(time) {
  const m = MOODS[mood];
  const stepLength = 60 / m.bpm / 2; // 八分音符
  const chord = m.chords[Math.floor(step / 8) % 4];
  const out = musicGain;
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
  if (mood !== 'night' && mood !== 'spooky' && step % 2 === 0) {
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

function startMusic() {
  if (musicTimer) return;
  nextNoteTime = ctx.currentTime + 0.1;
  // 每 50 毫秒睇一次，預先排定之後 0.2 秒嘅音（咁樣節奏先穩定）
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    while (nextNoteTime < ctx.currentTime + 0.2) nextNoteTime += scheduleStep(nextNoteTime);
  }, 50);
}

// 轉音樂風格：'hub'、'biome'、'boss'、'night'、'spooky'
export function setMusicMood(newMood) {
  if (newMood === mood || !MOODS[newMood]) return;
  mood = newMood;
  step = 0;
}

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
