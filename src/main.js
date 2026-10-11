// 遊戲由呢度開始：起場景、燈、鏡頭，然後每格畫面更新一次

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld, whereIs, BIOMES, updateBossSigns, sky, gate, HUB } from './world.js';
import { createPlayer, updatePlayer, teleportPlayer } from './player.js';
import { createDayNight, updateDayNight, dayCycle } from './daynight.js';
import {
  updateHud, popup, announce, isPanelOpen, panelKind, openPanel, closePanel, setPrompt, setCarrying, showFact,
  selectedHotbarItem, selectSlot, showZoneTitle, setSightings, setPetActions, setShopActions,
} from './hud.js';
import { state, save } from './state.js';
import {
  createRescue, spawnAnimal, nearestAnimal, borrow, deliver, loseAnimal, setHolding, updateRescue,
} from './animals.js';
import {
  createHub, updateHub, hubInteraction, trainingStationAt, upgradeStation, fillMachine, collectPet, placePet, scrollVideo,
  unequipPet, equipBest, sellPet, upgradePlot, upgradeMachines, refreshPlotPets,
} from './hub.js';
import { createHazards, updateHazards, hazardHit } from './hazards.js';
import { createBosses, updateBosses, stunBoss, sendBossHome, resetBosses } from './bosses.js';
import { askQuestion, isQuizOpen, finishQuiz } from './quiz.js';
import { play, unlockAudio, toggleMute, isMuted, setMusicMood } from './sound.js';
import { createIntro, updateIntro } from './intro.js';
import { createTutorial, startTutorial, updateTutorial } from './tutorial.js';
import { createThirdPerson, updateThirdPerson, zoomCamera, applyRangerSkin } from './thirdPerson.js';
import { questEvent, claimQuest, PET_TOKENS } from './quests.js';
import { RANGER_SKINS, PET_SKINS, HUB_EXPANSIONS, applyPetSkin, animateSkins } from './skins.js';
import { updateEvents, forceEvent, EVENTS, SECRET_EVENT } from './events.js';
import { LEVER } from './biomes.js';
import { BOSS_STUN_SECONDS, rarityInfo } from './data/balance.js';
import { itemMoney, formatKg } from './data/animals.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 之後畫質系統會再調
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // 顏色似電影咁自然
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 天空藍
scene.fog = new THREE.Fog(0xcfeaff, 70, 220); // 遠處慢慢變淡

// 燈：天空光 + 太陽（有影）
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6b5a3a, 1.3);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); // 暖暖嘅太陽光
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 100 });
scene.add(hemi, sun, sun.target);

// 星星（夜晚先見到）
const starPositions = [];
for (let i = 0; i < 800; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(250);
  v.y = Math.abs(v.y) + 20;
  starPositions.push(v.x, v.y, v.z - 100);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0, fog: false }),
);
scene.add(stars);

const updateWorld = buildWorld(scene);
const hub = createHub(scene);
const hazards = createHazards(scene);
const bosses = createBosses(scene);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
const player = createPlayer(camera, document.body);
// 發光效果（Bloom）：好光嘅嘢（燈條、水晶、光柱、Boss 紅眼）會發出柔和光暈，睇落型好多
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 1.05);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ================= 畫質（電腦慢就自動調低）=================
// 3 = 高（發光 + 清晰影）、2 = 中（冇發光）、1 = 低（解像度降、影細啲）、0 = 最低（冇影）
const QUALITY_NAMES = ['Lowest', 'Low', 'Medium', 'High'];
const quality = { level: 3, bloom: true, auto: true };
try {
  const saved = localStorage.getItem('animal-rescue-quality');
  if (saved !== null) Object.assign(quality, { level: Number(saved), auto: false });
} catch {
  // 記唔到就用自動
}
function applyQuality() {
  const q = quality.level;
  quality.bloom = q >= 3;
  renderer.setPixelRatio(q >= 2 ? Math.min(window.devicePixelRatio, 1.5) : q === 1 ? 0.85 : 0.7);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = q >= 1;
  sun.castShadow = q >= 1;
  const size = q >= 2 ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  scene.traverse((o) => o.material && (o.material.needsUpdate = true)); // 開／熄影要重新整物料
}
// 自動：每 3 秒量一次畫面幾順（每秒幾多格），太慢就降一級
let fpsFrames = 0;
let fpsTime = 0;
function autoQuality(dt) {
  if (!quality.auto || isPaused() || quality.level === 0) return;
  fpsFrames += 1;
  fpsTime += dt;
  if (fpsTime < 3) return;
  const fps = fpsFrames / fpsTime;
  fpsFrames = 0;
  fpsTime = 0;
  if (fps < 40) {
    quality.level -= 1;
    applyQuality();
    popup(`⚙️ Graphics: ${QUALITY_NAMES[quality.level]} (smoother)`);
  }
}
// G 掣：自己揀畫質（揀咗就唔再自動）
function cycleQuality() {
  quality.level = (quality.level + 3) % 4; // 高 → 中 → 低 → 最低 → 高
  quality.auto = false;
  try {
    localStorage.setItem('animal-rescue-quality', quality.level);
  } catch {
    // 記唔到就算
  }
  applyQuality();
  popup(`⚙️ Graphics: ${QUALITY_NAMES[quality.level]}`);
}
applyQuality();

const thirdPerson = createThirdPerson(scene, camera); // 拎住寵物時用第三身
applyRangerSkin(thirdPerson, RANGER_SKINS.find((s) => s.id === state.rangerSkin) || RANGER_SKINS[0]);

// 任務有進度：完成就提你去領代幣
function quest(id, amount = 1) {
  for (const q of questEvent(id, amount)) {
    popup('📜 Quest complete! Press Q to claim your tokens');
    play('ding');
  }
}
scene.add(camera); // 鏡頭要喺場景入面，手上拎住嘅嘢（掛喺鏡頭度）先會畫出嚟

// 每個生態區放一隻動物；Legendary／Mythic 要話俾全世界知！
const rescue = createRescue(scene, camera);
let introRunning = true; // 開場動畫播緊
function spawnAll() {
  const cycle = dayCycle(dayNight);
  const specials = BIOMES.map((_, b) => spawnAnimal(rescue, b, null, null, null, { seed: `day${cycle}-b${b}` })).filter((e) => e?.special);
  announceSpecials(specials);
}
function announceSpecials(specials) {
  if (introRunning) return; // 開場動畫完咗先講（見 intro.onDone）
  specials.forEach((e, i) => setTimeout(() => {
    announce(`✨ ${e.rarity.toUpperCase()} ${e.animal.name} in ${BIOMES[e.biome].name}!`);
    play('magic');
    popup('Follow the coloured light beam!');
  }, 3500 * (i + 1)));
}

const dayNight = createDayNight({ scene, hemi, sun, sky }, () => {
  // 入夜：鎖住生態區，喺入面嘅人由護林員帶返 Hub
  gate.locked = true;
  play('night');
  setTimeout(() => popup('🌙 Night bonus: Reproduce Machines are 10x faster!'), 3500);
  if (camera.position.z < 0) {
    if (rescue.carrying) {
      loseAnimal(rescue);
      setCarrying(null);
    }
    teleportPlayer(player, 0, 4);
    camera.rotation.set(0, 0, 0, 'YXZ');
    announce('🌙 Night! Rangers brought you back. The biomes are locked!');
  } else announce('🌙 Night falls... the biomes are locked and reset!');
  resetBosses(bosses);
  spawnAll(); // 每個生態區換過一隻新動物
}, () => {
  gate.locked = false;
  play('day');
  announce('☀️ Morning! The biomes are open!');
});
spawnAll(); // 放第一批動物（要日夜系統起好先知係第幾段白天）

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  thirdPerson.view.aspect = camera.aspect;
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ================= 開始／暫停／面板／問答 =================

const startScreen = document.getElementById('start');

// 開場動畫：播完（或者跳過）先出開始畫面
startScreen.hidden = true;
document.body.classList.add('intro');
const intro = createIntro(scene, camera);
const tutorial = createTutorial(scene, { camera, rescue, hub });
try {
  if (sessionStorage.getItem('animal-rescue-skip-intro')) {
    sessionStorage.removeItem('animal-rescue-skip-intro');
    intro.skipHandler();
  }
} catch {
  // 冇 sessionStorage 就照播
}
updateBossSigns(state.speed, state.iq);
intro.onDone = () => {
  document.body.classList.remove('intro');
  teleportPlayer(player, 0, 16);
  camera.rotation.set(0, 0, 0, 'YXZ');
  startScreen.hidden = false;
  introRunning = false;
  startTutorial(tutorial); // 新玩家：開始教學
  announceSpecials(rescue.wild.filter((w) => w.special));
};

const isPaused = () => intro.active || !startScreen.hidden || isPanelOpen() || isQuizOpen();

// Shift Lock（好似 Roblox）：Shift = 鎖住滑鼠（滑鼠轉鏡頭）；再撳 = 放開滑鼠（見到滑鼠，右鍵拖轉鏡頭）
function toggleShiftLock() {
  const c = player.controls;
  if (c.isLocked) {
    c.freeMode = true;
    c.unlock();
    popup('🖱️ Shift Lock OFF - hold right mouse button to turn');
  } else {
    c.freeMode = false;
    c.lock();
    popup('🔒 Shift Lock ON');
  }
}

function resume() {
  player.controls.freeMode = false;
  startScreen.hidden = false; // 如果鎖唔到滑鼠，就俾佢撳「Click to Play」
  player.controls.lock();
}

document.getElementById('start-button').addEventListener('click', () => {
  unlockAudio(); // 瀏覽器要撳過嘢先俾出聲
  play('click');
  player.controls.lock();
});

// 開／關聲（M 掣或者右上角個掣）
const muteButton = document.getElementById('mute-button');
const showMute = () => (muteButton.innerHTML = `${isMuted() ? '🔇' : '🔊'} <kbd>M</kbd>`);
showMute();
muteButton.addEventListener('click', () => {
  toggleMute();
  showMute();
  play('click');
});
player.controls.addEventListener('lock', () => {
  startScreen.hidden = true;
});
player.controls.addEventListener('unlock', () => {
  if (player.controls.freeMode) return; // Shift 放開滑鼠：唔暫停
  if (!isPanelOpen() && !isQuizOpen()) startScreen.hidden = false; // 撳 Esc 就暫停
  save();
});

function togglePanel(kind) {
  play('click');
  if (panelKind() === kind) {
    closePanel();
    resume();
  } else {
    startScreen.hidden = true;
    openPanel(kind);
    player.controls.unlock();
  }
}
document.getElementById('stats-button').addEventListener('click', () => togglePanel('stats'));
document.getElementById('index-button').addEventListener('click', () => togglePanel('index'));
document.getElementById('quests-button').addEventListener('click', () => togglePanel('quests'));
document.getElementById('panel-close').addEventListener('click', () => togglePanel(panelKind()));

// 問答：遊戲停住，放個滑鼠出嚟俾你揀答案
async function quiz(options) {
  player.controls.unlock();
  const right = await askQuestion(options);
  resume();
  return right;
}
document.getElementById('quiz-continue').addEventListener('click', finishQuiz);

window.addEventListener('keydown', (e) => {
  if (intro.active) return; // 開場動畫：撳掣只係跳過
  if (isQuizOpen()) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') finishQuiz();
    return; // 問緊問題時其他掣唔做嘢（1–4 係揀答案）
  }
  if (e.code === 'KeyP') togglePanel('stats');
  if (e.code === 'KeyI') togglePanel('index');
  if (e.code === 'KeyQ') togglePanel('quests');
  if (e.code === 'KeyE' && panelKind() === 'shop') return togglePanel('shop'); // 再撳 E 收埋商店
  if (e.code === 'KeyE' && panelKind() === 'pets') return togglePanel('pets'); // 再撳 E 收埋
  if (e.code === 'KeyG') cycleQuality();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) toggleShiftLock();
  if (e.code === 'Escape' && player.controls.freeMode) {
    player.controls.freeMode = false; // 放開滑鼠嗰陣撳 Esc：暫停
    startScreen.hidden = false;
    save();
  }
  if (e.code === 'KeyM') {
    unlockAudio();
    toggleMute();
    showMute();
  }
  if (isPaused()) return;
  if (e.code === 'KeyE') interact();
  const digit = e.code.match(/^Digit(\d)$/);
  if (digit) {
    selectSlot((Number(digit[1]) + 9) % 10); // 1 = 第一格 … 0 = 第十格
    play('click');
  }
});
window.addEventListener('wheel', (e) => {
  if (isPaused()) return;
  // 企喺跑步機上面：轆滑鼠碌短片；其他時候：拉近／拉遠鏡頭（拉到最近 = 第一身）；快捷欄用 1–0
  if (trainingStationAt(hub, camera.position.x, camera.position.z)?.kind === 'treadmill') {
    if (scrollVideo(hub, Math.sign(e.deltaY))) play('swoosh');
  } else zoomCamera(thirdPerson, Math.sign(e.deltaY));
});

// ================= E 掣：借動物／用設施 =================

const hubActions = {
  upgrade(station) {
    const result = upgradeStation(station);
    if (!result) return;
    quest('upgrade');
    if (result.newTierName) {
      announce(`✨ ${station.name} is now ${result.newTierName.toUpperCase()}!`);
      play('tierUp');
    } else {
      announce(`⬆️ ${station.name} Level ${result.level}!`);
      play('upgrade');
    }
    save();
  },
  fillMachine(machine, item) {
    const second = fillMachine(machine, item);
    popup(`💗 ${item.name}${second ? ` + ${second.name}` : ''} ${second ? 'are' : 'is'} in the machine!`);
    play('pop');
    save();
  },
  collect(machine) {
    const pets = collectPet(machine);
    const tokens = pets.reduce((n, p) => n + (PET_TOKENS[p.rarity || 'Common'] || 1), 0);
    state.tokens += tokens; // 每隻新寵物都有 Skin Tokens（越稀有越多）
    setTimeout(() => popup(`🎟️ +${tokens} Skin Tokens`), 1200);
    quest('pets', pets.length);
    const giant = pets.find((p) => p.sizeMul);
    announce(giant ? `🔥 GIANT x${giant.sizeMul} ${giant.name}!` : `🎉 You got ${pets.map((p) => `a ${p.name}`).join(' and ')}!`);
    play(giant ? 'tierUp' : 'ding');
    popup('Put it on your Plot to earn money!');
    save();
  },
  placePet(pet) {
    if (!placePet(hub, pet)) return;
    popup(`+$${itemMoney(pet).toLocaleString('en-US')} / sec`);
    play('coin');
    save();
  },
  openIndex: () => togglePanel('index'),
  openPets: () => togglePanel('pets'),
  openShop: () => togglePanel('shop'),
  upgradeMachines() {
    const lv = upgradeMachines(hub);
    if (!lv) return;
    quest('upgrade');
    announce(`💗 Reproduce Machines are now ${lv.name.toUpperCase()}! (${Math.round((1 - lv.timeFactor) * 100)}% faster)`);
    play('tierUp');
    save();
  },
  upgradePlot() {
    const skin = upgradePlot(hub);
    if (!skin) return;
    quest('upgrade');
    announce(`🌿 Bigger Plot! New skin: ${skin.name}`);
    play('upgrade');
    save();
  },
};

// 皮膚商店同任務嘅掣
setShopActions({
  handle(action, i) {
    if (action === 'claim') {
      const got = claimQuest(i);
      if (got) {
        popup(`🎟️ +${got} Skin Tokens!`);
        play('coin');
      }
      return;
    }
    const buy = (cost) => {
      if (state.tokens < cost) return false;
      state.tokens -= cost;
      play('upgrade');
      return true;
    };
    if (action === 'ranger-buy' || action === 'ranger-equip') {
      const skin = RANGER_SKINS[i];
      if (action === 'ranger-buy' && !buy(skin.cost)) return;
      if (!state.ownedRanger.includes(skin.id)) state.ownedRanger.push(skin.id);
      state.rangerSkin = skin.id;
      applyRangerSkin(thirdPerson, skin);
      popup(`🧑 You are now: ${skin.name}!`);
    }
    if (action === 'pet-buy' || action === 'pet-equip') {
      const skin = PET_SKINS[i];
      if (action === 'pet-buy' && !buy(skin.cost)) return;
      if (!state.ownedPet.includes(skin.id)) state.ownedPet.push(skin.id);
      state.petSkin = skin.id;
      refreshPlotPets(hub);
      if (rescue.holding) rescue.holding.name = '__refresh__'; // 手上嗰隻都換
      popup(`🐾 Pet skin: ${skin.name}!`);
    }
    if (action === 'hub-buy') {
      const exp = HUB_EXPANSIONS[i];
      if (state.hubLevel !== i || !buy(exp.cost)) return;
      state.hubLevel += 1;
      save();
      announce(`🏗️ Building ${exp.name}...`);
      // Hub 個地圖要重新起過：重新載入（唔再播開場動畫）
      try {
        sessionStorage.setItem('animal-rescue-skip-intro', '1');
      } catch {
        // 照載入
      }
      setTimeout(() => location.reload(), 1200);
      return;
    }
    save();
  },
});

// MY PETS 面板入面嘅掣
setPetActions({
  equip(pet) {
    if (placePet(hub, pet)) play('coin');
    save();
  },
  unequip(pet) {
    unequipPet(hub, pet);
    play('click');
    save();
  },
  best() {
    equipBest(hub);
    play('upgrade');
    save();
  },
  unequipAll() {
    state.pets.forEach((p) => unequipPet(hub, p));
    play('click');
    save();
  },
  sell(pet) {
    const price = sellPet(hub, pet);
    popup(`💰 Sold ${pet.name} for $${price.toLocaleString('en-US')}`);
    play('coin');
    save();
  },
});

function currentInteraction() {
  const pos = camera.position;
  // 山後面嘅秘密拉桿
  if (Math.hypot(pos.x - LEVER.x, pos.z - LEVER.z) < 2.5) {
    const wait = state.leverReadyAt - Date.now();
    if (wait > 0) return { prompt: '🔒 The lever is recharging...' };
    return { prompt: '<kbd>E</kbd> Pull the secret lever!', action: pullLever };
  }
  const w = nearestAnimal(rescue);
  if (w) {
    if (rescue.carrying) return { prompt: '🙌 Your hands are full - take your animal to the Hub first' };
    return { prompt: `<kbd>E</kbd> Borrow ${w.animal.name} (${formatKg(w.kg)})`, action: () => borrowAnimal(w) };
  }
  if (whereIs(pos.x, pos.z) !== 'Hub') return null;
  return hubInteraction(hub, pos.x, pos.z, selectedHotbarItem(), hubActions);
}

// 拉秘密拉桿：即刻開始一個隨機活動，10 分鐘後先拉得再
const LEVER_COOLDOWN_MS = 1000; // 小朋友：每 1 秒就拉得
function pullLever() {
  LEVER.pulledAt = time;
  quest('lever');
  state.leverReadyAt = Date.now() + LEVER_COOLDOWN_MS;
  play('boing');
  popup('🕹️ You pulled the secret lever!');
  const ev = Math.random() < 0.5 ? SECRET_EVENT : EVENTS[Math.floor(Math.random() * EVENTS.length)]; // 一半機會 BIG PET FRENZY
  setTimeout(() => forceEvent(ev.id), 700);
  save();
}

function interact() {
  const it = currentInteraction();
  if (it?.action) it.action();
}

function borrowAnimal(w) {
  borrow(rescue, w);
  play('borrow');
  setCarrying(`${w.animal.name} (${formatKg(w.kg)})`);
  announce(`You borrowed a ${formatKg(w.kg)} ${w.animal.name}!`);
  popup('Run back to the Hub! 🏃');
}

// ================= 撞到嘢／俾 Boss 捉到 =================

let safeTime = 0; // 答完問題之後幾秒唔會再撞

async function onHazardHit(h) {
  play('hit');
  const right = await quiz({ title: h.kind.title, biome: h.biome });
  safeTime = 2.5;
  if (right) quest('right');
  if (right) popup('✅ Correct! Keep going!');
  else if (rescue.carrying) {
    const animal = loseAnimal(rescue);
    setCarrying(null);
    announce(`😢 The ${animal.name} ran back to its biome!`);
  } else popup('Be careful out there!');
}

async function onBossCatch(boss) {
  const right = await quiz({ title: `😠 ${boss.info.name} caught you! Hard question!`, biome: boss.biome, hard: true });
  safeTime = 1;
  if (right) {
    quest('right');
    stunBoss(boss, BOSS_STUN_SECONDS);
    play('boing');
    announce(`😵 ${boss.info.name} is stunned! RUN!`);
    return;
  }
  sendBossHome(boss);
  if (rescue.carrying) {
    const animal = loseAnimal(rescue);
    setCarrying(null);
    announce(`😢 ${boss.info.name} took the ${animal.name} back!`);
  }
}

// ================= 隨機活動 =================
// 換晒野生動物（唔會換你抱緊嗰隻）；rarity 唔俾就隨機
function respawnWild(rare = false, tag = null) {
  if (!tag) return spawnAll(); // 活動完咗：返返呢段白天嘅動物
  BIOMES.forEach((_, b) => {
    const seed = `${tag}-b${b}`;
    const r = seededPick(seed) < 0.3 ? 'Mythic' : 'Legendary';
    spawnAnimal(rescue, b, null, null, rare ? r : null, { seed });
  });
}
const seededPick = (text) => [...text].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7) / 4294967296;
function handleEvents() {
  const { started, ended, tick, tickNo, status } = updateEvents();
  const tag = `${status.key}-${started?.id ?? status.ev.id}`;
  if (ended && !started) {
    if (['giant', 'rare', 'bigfrenzy'].includes(lastEventId)) respawnWild(); // 變返呢段白天嘅正常動物
    popup('The event is over! See you at the next one!');
  }
  if (started) {
    announce(`${started.emoji} EVENT: ${started.name}!`);
    setTimeout(() => popup(started.desc), 1500);
    play('magic');
    const prev = lastEventId;
    if (started.id === 'giant' || started.id === 'bigfrenzy') respawnWild(false, `${tag}-t${tickNo}`);
    else if (started.id === 'rare') respawnWild(true, tag);
    else if (['giant', 'rare', 'bigfrenzy'].includes(prev)) respawnWild(); // 由巨型轉去其他活動：變返正常
  }
  if (started) lastEventId = started.id;
  if (tick) respawnWild(false, `${tag}-t${tickNo}`); // Giant Pets：每 30 秒換一批
}
let lastEventId = null;

// ================= 主迴圈 =================

let pausedSince = 0; // 幾時開始暫停（0 = 冇暫停）
const timer = new THREE.Timer();
let time = 0;
let wasTraining = null;
let lastStep = 0;
let lastLocation = null;

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.1); // 卡機都唔好一下飛太遠
  time += dt;

  // 暫停：成個世界停低（開場動畫除外）；繁殖機倒數都暫停（返嚟時補返暫停咗嘅時間）
  const frozen = isPaused() && !intro.active;
  if (frozen) {
    if (!pausedSince) pausedSince = Date.now();
  } else if (pausedSince) {
    const pausedFor = Date.now() - pausedSince;
    for (const rec of state.machines) if (rec && rec.endsAt > pausedSince) rec.endsAt += pausedFor;
    pausedSince = 0;
  }
  if (!frozen) updateWorld(dt, time); // 水、雀、雪、拉桿
  const pos = camera.position;
  updateIntro(intro, dt);

  hub.night = dayNight.isNight; // 夜晚繁殖機 10 倍速
  if (isPaused()) updateHub(hub, 0, time, Infinity, Infinity); // 暫停：唔訓練唔賺錢，但啲牌照畫
  else {
    const station = trainingStationAt(hub, pos.x, pos.z);
    if (station && station !== wasTraining) {
      popup(`${station.statKey === 'speed' ? '🏃' : '📚'} Training ${station.stat}!`);
      if (station.video) setTimeout(() => popup('🖱️ Scroll to watch funny videos!'), 1300);
    }
    wasTraining = station;

    updatePlayer(player, dt, station ? station.standHeight : 0);
    const { trained, earned } = updateHub(hub, dt, time, pos.x, pos.z);
    if (earned) quest('money', earned);
    if (trained) {
      quest('train', 1);
      popup(`+${trained.amount.toLocaleString('en-US')} ${trained.station.stat}`);
      play('blip');
    }
    if (player.jumped) {
      player.jumped = false;
      quest('jump');
      play('boing');
    }
    // 腳步聲
    if (player.walking && Math.floor(player.bob / Math.PI) !== lastStep) {
      lastStep = Math.floor(player.bob / Math.PI);
      play('step');
    }

    updateHazards(hazards, dt, time);
    safeTime = Math.max(0, safeTime - dt);
    const location = whereIs(pos.x, pos.z);
    // 行入新地方：頂部彈個大大嘅名
    if (location !== lastLocation) {
      if (lastLocation !== null) {
        showZoneTitle(location);
        play('zone');
      }
      lastLocation = location;
    }

    // 抱住動物返到 Hub = 救援成功！
    if (rescue.carrying && location === 'Hub') {
      const { animal, reward, biomeBonus } = deliver(rescue);
      setCarrying(null);
      announce(`🎉 ${animal.name} rescued!`);
      quest('rescue');
      play('rescue');
      let extra = '<br>👉 Put it in a Reproduce Machine (bottom of the Hub)!';
      if (reward) extra += `<br>📖 New species in your Index! +$${reward.toLocaleString('en-US')}`;
      if (biomeBonus) extra += `<br>🏆 Biome complete! +$${biomeBonus.toLocaleString('en-US')}`;
      showFact(animal, extra);
      save();
    }

    const chasingBefore = bosses.some((b) => b.mode === 'chase');
    const caught = updateBosses(bosses, dt, time, {
      x: pos.x, z: pos.z, feetY: player.feetY, carryingBiome: rescue.carrying?.animal.biome ?? null,
    });
    if (!chasingBefore && bosses.some((b) => b.mode === 'chase')) {
      play('alarm');
      popup('⚠️ The Boss is chasing you! RUN!');
    }
    setSightings(rescue.wild.filter((w) => w.special), camera);
    // 背景音樂跟住情況轉：俾 Boss 追 > 夜晚 > 生態區 > Hub
    if (bosses.some((b) => b.mode === 'chase')) setMusicMood('boss');
    else if (dayNight.isNight) setMusicMood('night');
    else setMusicMood(location === 'Hub' ? 'hub' : 'biome');
    if (safeTime <= 0 && caught) onBossCatch(caught);
    else if (safeTime <= 0) {
      const hit = hazardHit(hazards, pos.x, pos.z, player.feetY); // 跳高啲就跳得過
      if (hit) onHazardHit(hit);
    }

    updateTutorial(tutorial, time);
    handleEvents();
    const it = currentInteraction();
    setPrompt(it?.prompt ?? null);
    updateBossSigns(state.speed, state.iq);
    updateDayNight(dayNight, dt);
    updateHud(dayNight, location);
  }

  setHolding(rescue, selectedHotbarItem()?.item.name ?? null);
  if (!frozen) updateRescue(rescue, dt, time, player.walking);
  // 拎住寵物／抱住動物：第三身，寵物頂喺頭上
  const viewCam = intro.active ? camera : updateThirdPerson(thirdPerson, dt, {
    held: rescue.carrying?.model || rescue.holding?.model || null,
    item: rescue.carrying ? { name: rescue.carrying.animal.name, kg: rescue.carrying.kg, sizeMul: rescue.carrying.sizeMul } : selectedHotbarItem()?.item,
    walking: player.walking, feetY: player.feetY,
    station: trainingStationAt(hub, camera.position.x, camera.position.z),
  });
  renderPass.camera = viewCam;
  LEVER.ready = state.leverReadyAt <= Date.now();
  stars.material.opacity = dayNight.blend;

  // 太陽跟住玩家，影先會一直清楚
  sun.position.set(pos.x + 15, 30, pos.z + 8);
  sun.target.position.set(pos.x, 0, pos.z);

  if (quality.bloom) composer.render();
  else renderer.render(scene, viewCam);
  autoQuality(dt);
});

// 開發用：喺瀏覽器 console 打 game 可以睇／改嘢
if (import.meta.env.DEV) window.game = { spawnAll, forceEvent, tutorial, quality, camera, player, dayNight, scene, rescue, hub, bosses, hazards, state, intro, spawn: (b, rarity) => spawnAnimal(rescue, b, null, null, rarity) };
