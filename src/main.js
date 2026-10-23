// 遊戲由呢度開始：起場景、燈、鏡頭，然後每格畫面更新一次

import * as THREE from 'three';
import { short } from './format.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createAmbience, updateAmbience, setAmbienceQuality } from './ambience.js'; // ✨ 粒子、雲、霧色、水光（2026-10-18 present 前靚啲）
import { playFirstHatch } from './firstHatch.js'; // 🥚 第一隻寵物出世動畫（一次）
import { buildStatueButton, pressStatueButton, updateStatueButton, nearStatueButton } from './statueButton.js'; // 🦏 犀牛像後面嘅掣
import { createCrazyButton, crazyInteraction, updateCrazy, refillCrazy, pressCrazy } from './crazyButton.js'; // 🤪 秘密沙灘嘅瘋狂寵物掣
import { buildWorld, whereIs, BIOMES, updateBossSigns, sky, gate, HUB, isWalkable, platforms, colliders, parkGate, kingdom, groundAt, gymArea, BIOME_LENGTH } from './world.js';
let kingdomDebug = false; // 測試用：game.openKingdom() 唔使等日期
import { createPlayer, updatePlayer, teleportPlayer, jumpHeight, jumpVelocity, moveOpts } from './player.js';
import { showDeviceChooser, setupMobile } from './mobile.js';
import { createDayNight, updateDayNight, dayCycle } from './daynight.js';
import {
  updateHud, popup, announce, isPanelOpen, panelKind, openPanel, closePanel, setPrompt, setCarrying, showFact,
  selectedHotbarItem, selectSlot, toolFlags, showZoneTitle, setSightings, setPetActions, setShopActions, setPortalActions,
  extraPanels,
} from './hud.js';
import { initSideBoxes, toggleSideBox, updateSideBoxes, sideBoxOpen } from './sideBoxes.js'; // 右邊中間：🐾 地塊寵物、⏱️ 繁殖機時間（小朋友 2026-10-18）
import { state, save, SAVE_KEY } from './state.js';
import { account, uploadSave } from './account.js';
import './saveToast.js'; // 💾 「Saved!」提示
import { setAdminActions } from './adminPanel.js'; // 🔐 Secret Ranger Control Panel
import {
  createRescue, spawnAnimal, nearestAnimal, borrow, deliver, loseAnimal, setHolding, updateRescue,
} from './animals.js';
import {
  createHub, updateHub, hubInteraction, trainingStationAt, upgradeStation, fillMachine, collectPet, placePet, scrollVideo,
  unequipPet, equipBest, sellPet, upgradePlot, upgradeMachines, refreshPlotPets, newlyMeteoric,
} from './hub.js';
import { createHazards, updateHazards, hazardHit } from './hazards.js';
import { createBosses, updateBosses, sendBossHome, resetBosses } from './bosses.js';
import { askQuestion, isQuizOpen, finishQuiz } from './quiz.js';
import { play, unlockAudio, toggleMute, isMuted, setMusicMood, setMusicPaused } from './sound.js';
import { createIntro, updateIntro } from './intro.js';
import { createTutorial, startTutorial, updateTutorial } from './tutorial.js';
import { createThirdPerson, updateThirdPerson, zoomCamera, applyRangerSkin } from './thirdPerson.js';
import { questEvent, claimQuest, PET_TOKENS } from './quests.js';
import { RANGER_SKINS, PET_SKINS, OLD_HUB_EXPANSION_COSTS, applyPetSkin, animateSkins } from './skins.js';
import { updateEvents, forceEvent, boost } from './events.js';
import { createEclipse, updateEclipse, applyEclipseSky, playEclipseIntro, STRIKE_RADIUS } from './eclipse.js';
import { createMeteorEvent, updateMeteor, applyMeteorSky, meteorShake } from './meteorEvent.js'; // ☄️ Issue #10 METEORIC
import { addFireAura } from './fireAura.js';
import { TRASH } from './biomes.js';
import { rarityInfo, TRASH_REWARD, BORROW_HEAD_START, LAB_REWARD, MACHINE_QUIZ_CUT, MACHINE_QUIZ_MIN_CUT, MACHINE_QUIZ_COOLDOWN, FUSE_MONEY_BONUS, MAX_TRAINING_LEVEL, MACHINE_LEVELS, PLOT_MAX_UPGRADES } from './data/balance.js';
import { animateFireAuras } from './fireAura.js';
import { buildLab, updateLabGuide, openParkGate, lab, portalReady, podsDone, legendaryDone, smashPod, hammerModel, batModel, sparkleBurst } from './lab.js';
import { movie, updateMovie, finishMovie, playMovie, once as movieOnce, shake as movieShake } from './movie.js';
import { buildSecretBeach, beach, applyBeachSky, playCollab, playBeachFinale } from './secretBeach.js';
import { playKingdomReveal, KINGDOM_STAIRS } from './enchanted.js';
import { KINGDOM_GATE, isNewBiomeOpen } from './biomes.js';
import { playLabEscape } from './labEscape.js';
import { ENDING_ANIMALS } from './labScenes.js';
import { park, standUp as ownerStandUp, lieOnHammock } from './hubPark.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal, randomKg, animalsInBiome } from './data/animals.js';
import { BENCH, STRANGER, BEACH_PORTAL, BEACH_ARRIVE } from './labShape.js';
import { playUnlockScene, playEnding } from './labScenes.js';
import { createLabFight, updateLabFight, debugFight, resetFight, avoidCameraClip, hideBoss, hasBat, batHit, batInRange } from './labBoss.js';
import { LAB, inLab, ARENA, ARENA_START, LAB_RETURN, PORTAL, EXIT_PORTAL, HAMMER_SPOT } from './labShape.js';
import { setGateOpen, fuseMachine, PARK_GATE } from './hubPark.js';
import { fusePets, isFuseOpen } from './fuse.js';
import { ANIMALS } from './data/animals.js';
import { itemMoney, formatKg, hasMutation, addMutation, mutationEmoji, sizeText, mutationInfo } from './data/animals.js';
import { inDiscord, startDiscord } from './discordActivity.js';
import { buildGym, gym, isGymOpen, gymStationAt, trainInGym, gymCountdown, gymOpenDateText, setGymPresent } from './gym.js';
import { GYM, GYM_PORTAL, GYM_FRONT, inGym, nearGymDoor, labStatus } from './labShape.js';
import { createFishing, fishingInteraction, fishingPress, fishingBusy, updateFishing, stopFishing, buyRod } from './fishing.js'; // 🎣 Halloween 釣魚（釣蛋 + 🌽 Candy Corn）
import { setRodShopActions } from './rodShop.js';
import { halloween, isHalloweenOpen, halloweenCountdown, buildHubPortal, buildHalloween, applyHalloweenSky } from './halloweenWorld.js'; // 🎃 Halloween 世界
import { HW_ARRIVE, GHOST_ARRIVE, inHalloween, inGhostWorld } from './halloweenShape.js';
import { buildHell, setWitchTowerEntry } from './hellWorld.js'; // 🔥 Halloween World 2：Hell + 飛天熔岩石 + Witch Castle（Issue #11）
import { HELL_ARRIVE, HELL_START, inHell, CASTLE_TOP, TOWER_DOOR, HELL_LAST_CP } from './hellShape.js';
import { inReaperHall } from './reaperShape.js';
import { inTowerArena } from './towerShape.js'; // 🗼 Endless Witch Tower（Issue #11）
import { createWitchTower } from './witchTower.js';
import { createExpedition, EXPEDITION_SPOT } from './worldExpedition.js'; // 🗺️ World Expedition 地圖（Soul Candy 開 World 2）
import { createPhantomExpress, forceTrain } from './phantomExpress.js'; // 🚂 每個鐘一班嘅鬼火車
import { createGhostHunt } from './ghostVacuum.js'; // 🧹 吸塵機 + 👻 Ghost World 嘅鬼
import { createShards } from './halloweenShards.js'; // 🗿 Halloween 雕像 + 🔮 Shard 變異
import { shardModel } from './gearArt.js'; // 💎 手上嘅 Shard 3D 模型
import { createInventory } from './inventory.js'; // 🎒 背包：Animals／Endangered Animals／Gears（Issue #10）
import { createHalloweenEggs } from './halloweenEggs.js'; // 🥚 Halloween 蛋 + NO MERCY Boss + 蛋墳場
import { createEchoShop, giveCandyCorn } from './echoShop.js'; // 🐕 Echo 隻狗 + 🧟 Zombified Chest（Issue #8）
import { createEchoQuests } from './echoQuestStall.js'; // 🐾 Echo's Questline 攤位（2026-10-22）
import { questline } from './questline.js';
import { createMeteorShop, giveCrystals, isMeteorOpen } from './meteorShop.js'; // ☄️ Meteoric Shop（Issue #10）
import { startBoostChips } from './boosts.js'; // ⚡ Meteoric Shop 嘅 Boosts（左邊細 chip 倒數）
import { createCosmicLanding, updateCosmicLanding } from './cosmicLanding.js'; // 🦸 Cosmic Meteor Ranger 超級英雄落地
import { createChests, giveChests } from './chests.js'; // 🧰 寶箱：買咗入背包，快捷欄撳滑鼠開（2026-10-22）
import { isChestGear } from './data/gears.js';
import { createMeteorBossSkins } from './meteorBossSkin.js'; // 🦹 Meteoric Boss Skin（Issue #10）
import { createDemonicBossSkins } from './demonicBossSkin.js'; // 😈 Demonic Boss Skin（Issue #11：Witch Tower 獎品）
import { createDemonicRanger, updateDemonicRanger } from './demonicRanger.js'; // 😈 Demonic Ranger：飛 + 火噴射跳
import { setDemonicHooks } from './demonicRewards.js'; // 🧙 Witch Tower 獎品 API（giveReward）
import { FOUNTAIN } from './hubPark.js';
import { showLoading, loading, startBoot, finishBoot } from './loading.js'; // ⏳ 載入畫面（Issue #8）
import { createWeapons } from './weapons.js'; // 🔫 魔法武器（Issue #11，之後 Endless Tower 都用）
import { createReaper } from './reaperBoss.js'; // 🐉 Pumpkin Reaper Dragon（Issue #11）

startBoot(); // 第一次開網頁嘅載入畫面：JS 載完 → 換真動物知識；起好第一格畫面就淡出

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
const hemi = new THREE.HemisphereLight(0xd4ebff, 0x5c6b3c, 1.3); // 地面反光帶少少草綠
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); // 暖暖嘅太陽光
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004; // 冇咗啲「影紋」
sun.shadow.normalBias = 0.02;
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
  new THREE.PointsMaterial({ color: 0xffffff, size: 1.9, transparent: true, opacity: 0, fog: false }),
);
scene.add(stars);
// 第二層細星（一閃一閃）
const stars2 = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPositions.map((v, i) => v * (i % 3 === 1 ? 0.97 : 1.03) + (i % 3 === 0 ? 9 : 0)), 3)),
  new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.2, transparent: true, opacity: 0, fog: false }),
);
scene.add(stars2);
const ambience = createAmbience(scene); // ✨ 粒子、雲、霧色

const updateWorld = buildWorld(scene);
const crazy = createCrazyButton(scene); // 🤪 Crazy Pet Frenzy 掣（秘密沙灘）
const statueBtn = buildStatueButton(scene); // 🦏 犀牛像後面嘅掣
const updateLab = buildLab(scene); // Issue #2：Hub 大門外面嘅 Laboratory
const updateGym = buildGym(scene); // 💪 Gym（小朋友 2026-10-18）：實驗室爆炸之後先見到
const hubPortal = buildHubPortal(scene, FOUNTAIN.x, FOUNTAIN.z); // 🎃 Hub 中間嘅 Halloween 傳送門（取代噴水池）
let hwWorld = null; // 🎃 Halloween 世界：第一次入去先起（載入畫面）
let hwEggs = null; // 🥚 Halloween 蛋同 Boss（同 hwWorld 一齊起）
let echo = null; // 🐕 Echo 嘅 Zombified Chest 舖（同 hwWorld 一齊起）
let echoQuests = null; // 🐾 Echo's Questline 攤位（同 hwWorld 一齊起）
let expedition = null; // 🗺️ World Expedition 地圖（同 hwWorld 一齊起）
let hell = null; // 🔥 Halloween World 2（第一次去先起）
labStatus.gone = !!state.labBossDefeated; // 舊存檔：打贏咗 Boss = 實驗室已經爆咗
const updateBeach = buildSecretBeach(scene); // Issue #2：秘密沙灘（打贏 Boss 先開）
const eclipse = createEclipse(scene); // Eclipse 日蝕活動（天上嘅日蝕、DNA 激光）
const meteor = createMeteorEvent(scene); // ☄️ METEORIC：隕石撞落嚟、執水晶、天上流星
const hub = createHub(scene);
// 舊存檔：Enchanted Sunlion 改咗名做 Celestial Sunlion
{
  const fix = (o) => o && o.name === 'Enchanted Sunlion' && (o.name = 'Celestial Sunlion');
  state.pets.forEach(fix);
  state.borrowed.forEach(fix);
  state.machines.forEach((m) => {
    fix(m);
    fix(m?.second);
  });
  state.indexFound = state.indexFound.map((n) => (n === 'Enchanted Sunlion' ? 'Celestial Sunlion' : n));
}
// 舊存檔已經有寵物：唔使再睇第一隻寵物出世動畫
if (!state.firstHatchSeen && state.pets.length > 0) state.firstHatchSeen = true;
// Fuse nerf（2026-10-18）：舊 Fuse 寵物用新計法（3 隻平均 × 新倍數，以前係 3 隻加埋 × 舊倍數）
if (!state.fuseNerfed) {
  const OLD = { Common: 1.3, Rare: 1.6, Epic: 2.2, Legendary: 3.5, Mythic: 6 };
  for (const p of state.pets) if (p.fuse && p.money && OLD[p.rarity]) p.money = Math.max(1, Math.round((p.money * FUSE_MONEY_BONUS[p.rarity]) / (3 * OLD[p.rarity])));
  state.fuseNerfed = true;
}
// 舊存檔買過「擴建 Hub」：而家 Hub 免費變大咗，退返啲代幣
let hubRefund = 0;
if (state.hubLevel > 0) {
  hubRefund = OLD_HUB_EXPANSION_COSTS.slice(0, state.hubLevel).reduce((a, b) => a + b, 0);
  state.tokens += hubRefund;
  state.hubLevel = 0;
}
const hazards = createHazards(scene);
const bosses = createBosses(scene);
const bossSkins = createMeteorBossSkins(bosses); // 🦹 Boss 隕石皮膚（買咗之後撳 E 換）
const demonicBossSkins = createDemonicBossSkins(bosses); // 😈 Boss 惡魔皮膚（Witch Tower 解鎖咗之後撳 E 輪住換）
const fight = createLabFight(scene); // Issue #2：實驗室 Boss（Mutated Scientist Poacher）
fight.onDefeat = () => {
  state.labBossDefeated = true; // 打贏咗：存檔（F5 都唔會再出）
  save();
};

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
const meteorShop = createMeteorShop({ scene, camera, openShop: () => togglePanel('meteor'), teleport: (x, z) => teleportPlayer(player, x, z), resume, popup, announce, equipRanger: (skin) => applyRangerSkin(thirdPerson, skin) }); // ☄️ Hub 圖書館隔籬
const player = createPlayer(camera, document.body);
// Discord Activity：鎖唔到滑鼠，改用撳住滑鼠拖轉鏡頭；平時網頁版唔變（src/discordActivity.js）
if (inDiscord()) {
  player.controls.virtual = true;
  player.controls.dragLook = true;
  startDiscord();
}
// 發光效果（Bloom）：好光嘅嘢（燈條、水晶、光柱、Boss 紅眼）會發出柔和光暈，睇落型好多
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 1.05);
composer.addPass(bloomPass);
// 調色（2026-10-18）：顏色鮮少少、對比少少、四邊淡淡暗角（電影感）
const gradePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, saturation: { value: 1.12 }, contrast: { value: 1.04 }, vignette: { value: 0.32 }, warmth: { value: 0.025 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform float vignette; uniform float warmth; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 col = mix(vec3(l), c.rgb, saturation);
      col = (col - 0.18) * contrast + 0.18;
      col += vec3(warmth, warmth * 0.4, -warmth * 0.5) * l;
      vec2 v = vUv - 0.5;
      col *= 1.0 - vignette * smoothstep(0.25, 0.8, dot(v, v) * 2.0);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
});
composer.addPass(gradePass);
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
  sun.shadow.radius = q >= 2 ? 2.5 : 1; // 高／中畫質：影嘅邊柔和啲
  setAmbienceQuality(ambience, q); // ✨ 粒子：最低 = 冇、低 = 一半
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
const superLand = createCosmicLanding(scene); // 🦸
const demonicFx = createDemonicRanger(scene); // 😈 火星尾巴 + 火噴射
startBoostChips();
// 🎣 Halloween 釣魚：魚竿舖、力度條拋竿、狂撳收線、釣蛋同 🌽 Candy Corn（src/fishing.js）
const fishing = createFishing({ scene, camera, avatar: thirdPerson.avatar, view: thirdPerson.view }); // view：第三身準星瞄準用（Issue #10）
const fishUI = { play: (n) => play(n), popup: (t) => popup(t), announce: (t) => announce(t), save: () => save(), flash: () => flashScreen() };
setRodShopActions({ buy: (i) => buyRod(i, fishUI) });
if (!Number.isInteger(state.rod)) state.rod = 0; // 舊存檔（以前魚竿會斷，係 null）：每個人都有免費 Twig Rod
// Issue #2：手上嘅鎚仔（第一身掛喺鏡頭；第三身掛喺公仔右手）
const handHammer = hammerModel();
handHammer.position.set(0.45, -0.45, -0.8);
handHammer.rotation.set(-0.5, 0, 0.4);
handHammer.scale.setScalar(0.32);
handHammer.visible = false;
camera.add(handHammer);
const avatarHammer = hammerModel();
avatarHammer.position.set(0.22, -0.7, -0.15);
avatarHammer.rotation.set(-0.35, 0, -0.25); // 鎚頭向上，喺手臂旁邊（後面都睇到）
avatarHammer.scale.setScalar(1.3);
avatarHammer.visible = false;
thirdPerson.avatar.arms[1].add(avatarHammer);
const handBat = batModel();
handBat.position.set(0.45, -0.45, -0.8);
handBat.scale.setScalar(0.4);
handBat.visible = false;
camera.add(handBat);
const avatarBat = batModel();
avatarBat.position.set(0.22, -0.7, -0.15);
avatarBat.scale.setScalar(1.4);
avatarBat.visible = false;
thirdPerson.avatar.arms[1].add(avatarBat);
// 💎 手上嘅 Shard（快捷欄揀咗 Shard gear，src/gearArt.js）：第一身掛喺鏡頭，第三身掛喺右手
const handShard = new THREE.Group();
handShard.position.set(0.3, -0.2, -0.7);
handShard.rotation.set(0.15, 0, -0.15);
handShard.scale.setScalar(0.14);
camera.add(handShard);
const avatarShard = new THREE.Group();
avatarShard.position.set(0.05, -0.9, -0.35);
avatarShard.scale.setScalar(1.3);
thirdPerson.avatar.arms[1].add(avatarShard);
let heldShard = null; // 而家手上邊種 Shard
function holdShard(type) {
  if (type === heldShard) return;
  heldShard = type;
  for (const [holder, slot] of [[handShard, 'hand'], [avatarShard, 'avatar']]) {
    holder.clear();
    const m = type && shardModel(type, slot);
    if (m) holder.add(m);
  }
}
applyRangerSkin(thirdPerson, RANGER_SKINS.find((s) => s.id === state.rangerSkin) || RANGER_SKINS[0]);
setDemonicHooks({ equipRanger: (skin) => applyRangerSkin(thirdPerson, skin) }); // 🧙 Witch Tower 送皮膚即刻着
// ---- 🎃 Halloween：Phantom Express、捉鬼、Halloween Shard ----
const faceTo = (rotY) => camera.rotation.set(0, rotY, 0, 'YXZ');
const phantom = createPhantomExpress({ scene, teleport: (x, z) => teleportPlayer(player, x, z), showLoading, popup, announce, play, faceTo });
const ghostHunt = createGhostHunt({
  scene, camera, avatar: thirdPerson.avatar, popup, announce, play,
  isFirstPerson: () => thirdPerson.zoom === 0,
  isBlocked: () => isPaused() || phantom.travelling || loading.active,
  respawn(x, z, rotY) { // ❤️ 冇晒心：送返 Ghost World 火車站
    teleportPlayer(player, x, z);
    faceTo(rotY);
  },
  knockback(dir) {
    const p = camera.position;
    const x = p.x + dir.x * 2.5;
    const z = p.z + dir.z * 2.5;
    if (isWalkable(x, z)) teleportPlayer(player, x, z);
  },
});
const shards = createShards({
  scene, camera, hub, popup, announce, play,
  refreshPlot: () => refreshPlotPets(hub),
});
// 🔮 背包揀咗地塊上面嘅寵物：播傳送門動畫（回傳 false = 背包自己用卡仔特效）
function useHalloweenShard(pet, kind) {
  if (inHalloween(camera.position.x, camera.position.z) || movie.active || shards.busy) return false;
  if (panelKind()) closePanel();
  const back = { x: camera.position.x, z: camera.position.z, rot: camera.rotation.clone() };
  if (sideBoxOpen()) toggleSideBox(sideBoxOpen());
  player.controls.unlock();
  shards.teleportBack = () => {
    teleportPlayer(player, back.x, back.z);
    camera.rotation.copy(back.rot);
    resume();
  };
  if (shards.useShard(pet, kind)) return true;
  resume();
  return false;
}
// 🔫 武器（src/weapons.js）+ 🐉 Pumpkin Reaper Dragon（src/reaperBoss.js）
const weapons = createWeapons({
  scene, camera, avatar: thirdPerson.avatar, play, controls: player.controls,
  isActive: () => !isPaused() && (player.controls.isLocked || player.controls.freeMode),
});
const reaper = createReaper({
  scene, camera, player, weapons, play, popup, announce, isWalkable, showLoading,
  flash: () => flashScreen(),
  teleport: (x, z, rotY) => { teleportPlayer(player, x, z); faceTo(rotY); },
  isOpen: () => isHalloweenOpen(),
  isCarryingEgg: () => !!hwEggs?.isCarrying(),
});
// 🗼 Endless Witch Tower（src/witchTower.js）：Witch Castle 塔門入；完咗返去庭園（Hell 未起就先起）
const tower = createWitchTower({
  scene, camera, player, weapons, play, popup, announce, isWalkable, showLoading, extraPanels,
  flash: () => flashScreen(),
  teleport: (x, z, rotY) => { teleportPlayer(player, x, z); faceTo(rotY); },
  togglePanel: (kind) => togglePanel(kind),
  toCastle: () => towerToCastle(),
});
const chests = createChests(scene); // 🧰 開箱動畫（圍住玩家）
const inventory = createInventory({
  togglePanel: (kind) => togglePanel(kind), play,
  openChest: (type) => chests.open(type),
  refreshPlot: () => refreshPlotPets(hub),
  portalMutate: (pet, kind) => useHalloweenShard(pet, kind),
});
document.getElementById('inventory-button').addEventListener('click', () => inventory.toggle());

// 任務有進度：完成就提你去領代幣
function quest(id, amount = 1) {
  for (const q of questEvent(id, amount)) {
    popup('📜 Quest complete! Press J to claim your tokens');
    play('ding');
  }
}
scene.add(camera); // 鏡頭要喺場景入面，手上拎住嘅嘢（掛喺鏡頭度）先會畫出嚟

// 每個生態區放一隻動物；Legendary／Mythic 要話俾全世界知！
const rescue = createRescue(scene, camera);
let introRunning = true; // 開場動畫播緊
function spawnAll() {
  const cycle = dayCycle(dayNight);
  const specials = BIOMES.map((_, b) => spawnAnimal(rescue, b, null, null, null, { seed: `day${cycle}-b${b}` }));
  // Biome 7：多 2 隻（同時有 3 隻）
  for (const extra of ['x', 'y']) specials.push(spawnAnimal(rescue, 6, null, null, null, { seed: `day${cycle}-b6${extra}` }));
  refillCrazy(crazy, rescue); // 🤪 瘋狂寵物活動緊：入夜都唔會冇咗
  announceSpecials(specials.filter((e) => e?.special && (e.biome !== 6 || kingdom.open)));
}
function announceSpecials(specials) {
  if (introRunning) return; // 開場動畫完咗先講（見 intro.onDone）
  specials.forEach((e, i) => setTimeout(() => {
    if (e.rarity === 'Eternal') {
      // 小朋友：Eternal 出現要有打鼓聲同水晶聲
      play('drumroll');
      setTimeout(() => play('crystal'), 1700);
      setTimeout(() => announce(`🥁✨ ETERNAL ${e.animal.name}${e.sizeMul ? ' (GIANT!)' : ''} appeared in ${BIOMES[e.biome].name}! ✨🥁`), 1700);
      return;
    }
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
  if (camera.position.z < 0 && !inHalloween(camera.position.x, camera.position.z)) { // 🎃 Halloween 世界唔會俾人帶返 Hub
    if (rescue.carrying) {
      loseAnimal(rescue);
      setCarrying(null);
    }
    teleportPlayer(player, 0, 4);
    camera.rotation.set(0, 0, 0, 'YXZ');
    announce('🌙 Night! Rangers brought you back. The biomes are locked!');
  } else if (!inHalloween(camera.position.x, camera.position.z)) announce('🌙 Night falls... the biomes are locked and reset!'); // 🎃 Halloween 世界：唔講
  resetBosses(bosses);
  spawnAll(); // 每個生態區換過一隻新動物
}, () => {
  gate.locked = false;
  play('day');
  if (!inHalloween(camera.position.x, camera.position.z)) announce('☀️ Morning! The biomes are open!');
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
updateBossSigns(state.speed, state.iq);
intro.onDone = () => {
  document.body.classList.remove('intro');
  teleportPlayer(player, 0, 14);
  camera.rotation.set(0, 0, 0, 'YXZ');
  // 第一次玩：揀手機定電腦（只揀一次，小朋友 2026-10-17）
  if (!state.device) {
    showDeviceChooser((device) => {
      state.device = device;
      save();
      if (device === 'mobile') enableMobile();
      startScreen.hidden = false;
    });
  } else startScreen.hidden = false;
  introRunning = false;
  if (hubRefund) {
    save();
    announce(`🏗️ Your Hub is now BIG for free! You got back 🎟️ ${hubRefund} Skin Tokens.`);
  }
  if (state.labUnlocked) setGateOpen(1); // 開場動畫會閂返個閘
  startTutorial(tutorial); // 新玩家：開始教學
  announceSpecials(rescue.wild.filter((w) => w.special && (w.biome !== 6 || kingdom.open)));
};
// 跳過開場（要喺 onDone 設定好之後先跳，唔係就唔會執返 HUD）
try {
  if (sessionStorage.getItem('animal-rescue-skip-intro')) {
    sessionStorage.removeItem('animal-rescue-skip-intro');
    intro.skipHandler();
    if (sessionStorage.getItem('animal-rescue-goto-gym')) {
      sessionStorage.removeItem('animal-rescue-goto-gym');
      setTimeout(() => {
        teleportPlayer(player, GYM_FRONT.x, GYM_FRONT.z);
        camera.rotation.set(0, Math.PI, 0, 'YXZ');
        popup('💪 Welcome to the Ranger Gym!');
      }, 300);
    }
  }
} catch {
  // 冇 sessionStorage 就照播
}

const isPaused = () => intro.active || movie.active || loading.active || !startScreen.hidden || isPanelOpen() || isQuizOpen() || !!document.getElementById('device-chooser');

// 手機版：觸控（搖桿、拖動轉鏡頭、掣），畫質預設低啲
let mobileOn = false;
function enableMobile() {
  if (mobileOn) return;
  mobileOn = true;
  setupMobile({
    controls: player.controls,
    isPaused,
    onUse: () => {
      if (['shop', 'pets', 'sell', 'portal', 'fuse', 'admin', 'statue', 'vacuum', 'rods', 'echo', 'echoQuests', 'meteor', 'expedition', 'witch', 'tower'].includes(panelKind())) return togglePanel(panelKind()); // 再撳 USE 收埋
      if (!isPaused()) interact();
    },
    onPause: () => {
      if (isPanelOpen()) return togglePanel(panelKind());
      player.controls.unlock();
    },
    onZoom: (dir) => zoomCamera(thirdPerson, dir),
  });
  if (quality.auto && quality.level > 1) {
    quality.level = 1;
    applyQuality();
  }
}
if (state.device === 'mobile') enableMobile();

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

let quietUnlock = false; // 問問題／開面板時放開滑鼠：唔好彈「Start your game」
function resume() {
  player.controls.freeMode = false;
  player.controls.lock();
  // 鎖唔到滑鼠先俾佢撳「Click to Play」（以前一開始就彈，答完題目會閃一閃開始畫面）
  setTimeout(() => {
    if (!player.controls.isLocked && !player.controls.freeMode && !isPanelOpen() && !isQuizOpen() && !intro.active && !movie.active) startScreen.hidden = false;
  }, 450);
}

document.getElementById('start-button').addEventListener('click', () => {
  unlockAudio(); // 瀏覽器要撳過嘢先俾出聲
  play('click');
  player.controls.lock();
});

// 開／關聲（M 掣或者右上角個掣）
const muteButton = document.getElementById('mute-button');
const showMute = () => (muteButton.innerHTML = `${isMuted() ? '🔇' : '🔊'} <kbd>N</kbd>`);
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
  if (quietUnlock) return (quietUnlock = false);
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

// 隱藏寵物（巨型寵物遮住成個 Hub 嗰陣好有用）：地塊寵物同手上／頭頂嗰隻都收埋，照樣賺錢
let petsHidden = false;
try {
  petsHidden = localStorage.getItem('animal-rescue-hide-pets') === '1';
} catch {
  // 記唔到就算
}
const hideBtn = document.getElementById('hide-pets-button');
function showHideBtn() {
  hideBtn.innerHTML = `${petsHidden ? '🙈 <span class="hb-label">Pets hidden</span>' : '👁️ <span class="hb-label">Pets</span>'} <kbd>H</kbd>`; // hb-label：手機收埋字，淨係見圖案
}
function toggleHidePets() {
  petsHidden = !petsHidden;
  try {
    localStorage.setItem('animal-rescue-hide-pets', petsHidden ? '1' : '0');
  } catch {
    // 記唔到就算
  }
  showHideBtn();
  popup(petsHidden ? '🙈 Pets hidden (they still earn money!)' : '👁️ Pets visible');
  play('click');
}
showHideBtn();
hideBtn.addEventListener('click', toggleHidePets);
document.getElementById('panel-close').addEventListener('click', () => togglePanel(panelKind()));

// 問答：遊戲停住，放個滑鼠出嚟俾你揀答案
async function quiz(options) {
  if (player.controls.isLocked) quietUnlock = true;
  player.controls.unlock();
  const right = await askQuestion(options);
  resume();
  return right;
}
document.getElementById('quiz-continue').addEventListener('click', finishQuiz);

window.addEventListener('keydown', (e) => {
  if (intro.active || movie.active) return; // 開場動畫／細電影：撳掣只係跳過
  if (isQuizOpen()) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') finishQuiz();
    return; // 問緊問題時其他掣唔做嘢（1–4 係揀答案）
  }
  if (e.code === 'Backquote') inventory.toggle(); // 🎒 背包
  if (e.code === 'KeyP') togglePanel('stats');
  if (e.code === 'KeyI') togglePanel('index');
  if (e.code === 'KeyJ') togglePanel('quests'); // 📜 Quests（Issue #14：Q 讓咗俾控制面板）
  if (e.code === 'KeyQ') togglePanel('admin'); // 🔐 控制面板（未解鎖就出密碼畫面）
  if (e.code === 'KeyH') toggleHidePets();
  if (e.code === 'KeyB' && !isPanelOpen()) toggleSideBox('pets'); // 🐾 地塊寵物
  if (e.code === 'KeyT' && !isPanelOpen()) toggleSideBox('timers'); // ⏱️ 繁殖機時間
  if (e.code === 'KeyE' && panelKind() === 'shop') return togglePanel('shop'); // 再撳 E 收埋商店
  if (e.code === 'KeyE' && ['pets', 'sell', 'portal', 'fuse', 'admin', 'statue', 'vacuum', 'rods', 'echo', 'echoQuests', 'meteor', 'expedition', 'witch', 'tower'].includes(panelKind())) return togglePanel(panelKind()); // 再撳 E 收埋
  if (e.code === 'KeyG') cycleQuality();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) toggleShiftLock();
  if (e.code === 'Escape' && player.controls.dragLook && player.controls.isLocked && !player.controls.freeMode) player.controls.unlock(); // Discord：冇滑鼠鎖，Esc 自己暫停
  if (e.code === 'Escape' && player.controls.freeMode) {
    player.controls.freeMode = false; // 放開滑鼠嗰陣撳 Esc：暫停
    startScreen.hidden = false;
    save();
  }
  if (e.code === 'KeyN') { // 🔊 聲（以前係 M）
    unlockAudio();
    toggleMute();
    showMute();
  }
  if (e.code === 'KeyM') { // 🐢 慢行模式：朋友玩太快會頭暈
    moveOpts.slow = !moveOpts.slow;
    play('click');
    popup(moveOpts.slow ? '🐢 Slow walk ON (press M again to run fast)' : '⚡ Slow walk OFF - full speed!');
  }
  if (isPaused()) return;
  if (e.code === 'KeyE' && !(e.repeat && fishingBusy(fishing))) interact(); // 🎣 釣緊魚：長撳嘅自動重複唔算狂撳
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
    // 🥚 第一隻寵物：播一次出世動畫（敲玻璃 → 爆 → 跳圈圈），播完先講收到咩
    if (!state.firstHatchSeen && pets.length) {
      state.firstHatchSeen = true;
      save();
      const back = { x: camera.position.x, z: camera.position.z, rot: camera.rotation.clone() };
      player.controls.unlock();
      closePanel();
      playFirstHatch({
        scene, camera, machine, pet: pets[0], from: back,
        onDone() {
          teleportPlayer(player, back.x, back.z);
          camera.rotation.copy(back.rot);
          afterCollect(pets);
          resume();
        },
      });
      return;
    }
    afterCollect(pets);
  },
  // Dragon's Lair：答啱問題，繁殖快啲
  async speedUpMachine(machine) {
    const rec = state.machines[machine.index];
    if (!rec || (rec.quizReadyAt || 0) > Date.now()) return;
    const right = await quiz({ title: "🐉 Dragon's Lair: answer right to SPEED UP!", biome: rec.biome });
    const now = state.machines[machine.index];
    if (!now) return;
    now.quizReadyAt = Date.now() + MACHINE_QUIZ_COOLDOWN * 1000;
    if (right) {
      const left = Math.max(0, now.endsAt - Date.now());
      const cut = Math.max(left * MACHINE_QUIZ_CUT, MACHINE_QUIZ_MIN_CUT * 1000);
      now.endsAt = Math.max(Date.now(), now.endsAt - cut);
      quest('right');
      popup(`⏩ Correct! ${Math.round(cut / 1000)} seconds faster!`);
      play('magic');
    } else popup('❌ Not this time... try again soon!');
    save();
  },
  placePet(pet) {
    if (!placePet(hub, pet)) return;
    popup(`+$${short(itemMoney(pet))} / sec`);
    play('coin');
    save();
  },
  openIndex: () => togglePanel('index'),
  openPets: () => togglePanel('pets'),
  openSell: () => togglePanel('sell'),
  saveProgress() {
    save();
    play('coin');
    if (!account.enabled) return popup('💾 Saved on this computer!');
    popup('☁️ Saving to your account...');
    uploadSave(true)
      .then(() => popup(`✅ Progress saved, ${account.name}! You can play on any computer now.`))
      .catch(() => popup('📡 No internet right now. Saved on this computer, will save online later!'));
  },
  openFuse: () => togglePanel('fuse'),
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
      if ((skin.meteor || skin.tower) && !state.ownedRanger.includes(skin.id)) return; // 🌠 Meteoric Shop／😈 Witch Tower 先攞得
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
    save();
  },
});

// 右邊中間兩粒掣：開盒嗰陣放開滑鼠（似 Shift Lock OFF，遊戲照玩），等你撳得到 Unequip；收盒就鎖返
let sideFreed = false;
initSideBoxes({
  machineCount: hub.machines.length,
  useShard: () => inventory.useGear('halloweenShard'), // 🔮 開背包揀寵物
  openAll() {
    toggleSideBox('pets');
    togglePanel('pets');
  },
  unequip(pet) {
    unequipPet(hub, pet);
    play('click');
    save();
  },
  onToggle(open) {
    play('click');
    const c = player.controls;
    if (open && c.isLocked && !c.virtual && !c.dragLook) {
      c.freeMode = true;
      sideFreed = true;
      c.unlock();
    } else if (!open && sideFreed) {
      sideFreed = false;
      if (c.freeMode && !isPaused()) {
        c.freeMode = false;
        c.lock();
      }
    }
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
    popup(`💰 Sold ${pet.name} for $${short(price)}`);
    play('coin');
    save();
  },
  // Fuse Machine：3 隻變 1 隻
  fuse(pets) {
    const pet = fusePets(pets);
    if (!pet) return;
    for (const p of pets) p.onPlot = false;
    refreshPlotPets(hub);
    fuseMachine.showResult(pet.name);
    play('magic');
    setTimeout(() => play('upgrade'), 1200);
    const r = rarityInfo(pet.rarity);
    announce(`🧪 FUSED! You got a ${r.name.toUpperCase()} ${pet.name}! ($${short(itemMoney(pet))}/s)`);
    save();
    closePanel();
    resume();
  },
  sellMany(pets) {
    const price = pets.reduce((n, p) => n + sellPet(hub, p), 0);
    popup(`💰 Sold ${pets.length} pets for $${short(price)}`);
    play('coin');
    save();
  },
});

function currentInteraction() {
  const pos = camera.position;
  // 🎃 Halloween 傳送門：Hub 中間（未開就話幾時開）；Halloween 世界出生點嗰道返 Hub
  if (hubPortal.near(pos)) {
    if (!isHalloweenOpen()) return { prompt: `🔒 🎃 The Halloween World opens in ${halloweenCountdown()}` };
    if (rescue.carrying) return { prompt: '🐾 Bring your animal to the Hub first, then enter the Halloween World!' };
    return { prompt: '<kbd>E</kbd> 🎃 Enter the HALLOWEEN WORLD 👻', action: enterHalloween };
  }
  const hwEggAct = hwEggs?.interaction(pos); // 🥚 攞蛋／放蛋／孵蛋
  if (hwEggAct) return hwEggAct;
  const echoAct = echo?.interaction(pos); // 🐕 Echo：買 Zombified Chest
  if (echoAct) return echoAct;
  const questAct = echoQuests?.interaction(pos); // 🐾 Echo's Questline
  if (questAct) return questAct;
  const exAct = expedition?.interaction(pos); // 🗺️ World Expedition 地圖
  if (exAct) return exAct;
  const towerAct = tower.interaction(pos); // 🗼 塔入面：出口、升降魔法陣
  if (towerAct) return towerAct;
  const hellAct = hell?.interaction(pos); // 🔥 Hell：傳送門、🧙‍♀️ 女巫、🗼 Witch Tower 門
  if (hellAct) return hellAct;
  const meteorAct = meteorShop.interaction(pos); // ☄️ Meteoric Shop
  if (meteorAct) return meteorAct;
  const reaperAct = reaper.interaction(pos); // 🐉 大屋前門
  if (reaperAct) return reaperAct;
  if (hwWorld && inHalloween(pos.x, pos.z) && hwWorld.nearBackPortal(pos)) return { prompt: '<kbd>E</kbd> 🌀 Go back to the Hub', action: leaveHalloween };
  if (inHalloween(pos.x, pos.z)) {
    const hw = phantom.interaction(pos) || shards.interaction(pos) || ghostHunt.interaction(pos); // 🚂 上車／返程、🗿 雕像、🧹 吸塵機舖
    if (hw) return hw;
  }
  if (hwWorld && inHalloween(pos.x, pos.z)) {
    const fi = fishingInteraction(fishing, pos, { openShop: () => togglePanel('rods'), ui: fishUI }); // 🎣 魚竿舖／釣魚
    if (fi) return fi;
  }
  // Biome 2 沙灘嘅垃圾：執走有少少錢
  const trash = TRASH.find((t) => t.group.visible && Math.hypot(pos.x - t.x, pos.z - t.z) < 2);
  if (trash) return { prompt: `<kbd>E</kbd> Clean up the ${trash.name} 🗑️ (+$${TRASH_REWARD})`, action: () => cleanTrash(trash) };
  // 秘密沙灘：長櫈坐低睇流星、同神秘人傾偈
  if (beach.open) {
    if (Math.hypot(pos.x - BEACH_PORTAL.x, pos.z - BEACH_PORTAL.z) < 2.6) return { prompt: '<kbd>E</kbd> 🌀 Go back to the Park', action: () => travel(0, 14, 0, '🏡 Back to the Animal Rescue Park!') };
    if (whereIs(pos.x, pos.z) === 'Laboratory' && Math.hypot(pos.x - PORTAL.x, pos.z - PORTAL.z) < 3.2) return { prompt: '<kbd>E</kbd> 🌀 Go to the Secret Beach 🏖️', action: goToBeach };
    if (gym.present && Math.hypot(pos.x - GYM_PORTAL.x, pos.z - GYM_PORTAL.z) < 3.2) return { prompt: '<kbd>E</kbd> 🌀 Go to the Secret Beach 🏖️', action: goToBeach };
    const cb = crazyInteraction(crazy, pos, () => togglePanel('admin')); // 🔐 秘密掣：打開 Secret Ranger Control Panel
    if (cb) return cb;
    if (sitting) return { prompt: '🌠 Watching the meteors... <kbd>E</kbd> Stand up', action: standUp };
    if (Math.hypot(pos.x - BENCH.x, pos.z - BENCH.z) < 2.4) return { prompt: '<kbd>E</kbd> Sit down and watch the meteors 🌠', action: sitDown };
    if (Math.hypot(pos.x - STRANGER.x, pos.z - STRANGER.z) < 3) return { prompt: '<kbd>E</kbd> Talk to the mysterious ranger ❓', action: startCollab };
  }
  // 🦏 犀牛像後面個掣：Speed 夠最後生態區、錢夠升晒級，但 IQ 變 0
  if (nearStatueButton(pos)) return { prompt: '<kbd>E</kbd> Press the button behind the rhino 🦏 (⚠️ your IQ becomes 0!)', action: () => {
    const { money, speed } = pressStatueButton(statueBtn);
    save();
    play('magic');
    announce(`🦏 WHOOSH! +$${short(money)} and ${short(speed)} Speed... but your IQ is now 0! 🧠❌`);
  } };
  // 💪 Gym 未開門
  if (gym.present && !gym.open && nearGymDoor(pos.x, pos.z)) {
    return { prompt: `🚧 The GYM opens on ${gymOpenDateText()}! (in ${gymCountdown()})` };
  }
  // Boss 戰：用球棒打佢
  if (selectedHotbarItem()?.item.bat && whereIs(pos.x, pos.z) === 'Boss Arena') {
    if (batInRange(fight, pos)) return { prompt: '<kbd>E</kbd> / Click: SMACK him with your bat! 🏏', action: swingBat };
    return { prompt: '🏏 Get closer to the Scientist to hit him!' };
  }
  // ⚙️ 快捷欄揀咗 Gear（例如 Shard）：E／撳滑鼠 = 開背包揀寵物
  const gearSel = selectedHotbarItem();
  if (gearSel?.kind === 'gear' && isChestGear(gearSel.item.gear)) return { prompt: `<kbd>E</kbd> / Click: open a ${gearSel.item.name} 🧰 (x${gearSel.item.count})`, action: () => inventory.useGear(gearSel.item.gear, true) };
  if (gearSel?.kind === 'gear') return { prompt: `<kbd>E</kbd> / Click: use your ${gearSel.item.name} on a pet`, action: () => inventory.useGear(gearSel.item.gear) };
  const lab2 = labInteraction(pos);
  if (lab2) return lab2;
  const w = nearestAnimal(rescue);
  if (w) {
    if (rescue.carrying) return { prompt: '🙌 Your hands are full - take your animal to the Hub first' };
    return { prompt: `<kbd>E</kbd> Borrow ${w.animal.name} (${formatKg(w.kg)})`, action: () => borrowAnimal(w) };
  }
  const skinAct = demonicBossSkins.interaction(pos, rescue.carrying) || bossSkins.interaction(pos, rescue.carrying); // 🦹 Boss 隔籬：換隕石／惡魔皮膚
  if (skinAct) return skinAct;
  if (whereIs(pos.x, pos.z) !== 'Hub') return null;
  return hubInteraction(hub, pos.x, pos.z, selectedHotbarItem(), hubActions);
}

// ================= Issue #2：鎚仔、紅色掣、玻璃艙、傳送門 =================
const near = (pos, p, d) => Math.hypot(pos.x - p.x, pos.z - p.z) < d;
const holdingHammer = () => selectedHotbarItem()?.kind === 'tool' && !selectedHotbarItem().item.bat && !selectedHotbarItem().item.weapon; // 🔫 武器自己處理（weapons.js）
function labInteraction(pos) {
  // Biome 6 座山後面嘅鎚仔
  if (!state.hasHammer && !state.labBossDefeated && near(pos, HAMMER_SPOT, 2.6)) return { prompt: '<kbd>E</kbd> Pick up the 🔨 Hammer', action: pickUpHammer };
  // 公園大閘（去實驗室）：以前要撳橋下面個紅掣（小朋友 2026-10-18 刪咗），而家行到閘前面撳 E 就開
  if (!state.labUnlocked && pos.z < PARK_GATE.z && near(pos, PARK_GATE, 4)) return { prompt: '<kbd>E</kbd> Break the chains and open the gate 🔓', action: startUnlockScene };
  if (whereIs(pos.x, pos.z) !== 'Laboratory') return null;
  // 玻璃艙
  const pod = lab.pods.find((p) => !p.free && near(pos, p, 3.6));
  if (pod) {
    if (holdingHammer()) return { prompt: `<kbd>E</kbd> or click: 🔨 Smash the pod and free the ${pod.animal.name}!`, action: () => smashPodNow(pod) };
    if (state.hasHammer) return { prompt: `🔨 Pick your Hammer in the hotbar (slot 1) to smash the pod` };
    return { prompt: '🔒 You need the Hammer (found behind the mountain in Biome 6)' };
  }
  // 傳送門
  if (!state.labBossDefeated && near(pos, PORTAL, 6)) {
    if (portalReady()) return { prompt: '🌀 The portal is OPEN! Walk into it to enter the BOSS ARENA!' };
    return { prompt: '<kbd>E</kbd> 🌀 Look at the Portal (how to open it)', action: () => togglePanel('portal') };
  }
  return null;
}
function pickUpHammer() {
  state.hasHammer = true;
  lab.hammer.g.visible = false;
  sparkleBurst(new THREE.Vector3(HAMMER_SPOT.x, 1.5, HAMMER_SPOT.z), 0xffd600, 30);
  selectSlot(0);
  announce('🔨 You found the HAMMER! It stays in your hotbar forever.');
  setTimeout(() => popup('Use it to smash the glass pods in the Laboratory!'), 1800);
  play('tierUp');
  save();
}
function smashPodNow(pod) {
  if (pod.free) return;
  smashPod(pod);
  state.labPodsSmashed.push(pod.i);
  play('slam');
  play('rescue');
  const n = state.labPodsSmashed.length;
  popup(`🔨 You freed the ${pod.animal.name}! (${n} / ${lab.pods.length})`);
  if (podsDone()) setTimeout(() => {
    announce('🌀 All pods smashed! The PORTAL is open!');
    play('portal');
  }, 1200);
  save();
}
// Route B：交 Legendary 俾傳送門（佢哋會由 Index 消失）
setPortalActions({
  status: () => ({
    ready: portalReady(), pods: state.labPodsSmashed.length, podsTotal: lab.pods.length, legendary: state.labLegendaryGiven,
  }),
  give(items) {
    for (const item of items) {
      const pi = state.pets.indexOf(item);
      if (pi >= 0) {
        if (item.onPlot) unequipPet(hub, item);
        state.pets.splice(state.pets.indexOf(item), 1);
      }
      const bi = state.borrowed.indexOf(item);
      if (bi >= 0) state.borrowed.splice(bi, 1);
      state.indexFound = state.indexFound.filter((n) => n !== item.name);
      if (!state.labGivenSpecies.includes(item.name)) state.labGivenSpecies.push(item.name);
    }
    state.labLegendaryGiven += items.length;
    refreshPlotPets(hub);
    play('portal');
    popup(`🌀 The portal took ${items.length} Legendary animals...`);
    if (legendaryDone()) setTimeout(() => announce('🌀 The PORTAL is open! Walk into it!'), 600);
    save();
  },
});
// ================= 🔐 Secret Ranger Control Panel（秘密沙灘個掣，小朋友 2026-10-18） =================
const BACKUP_KEY = `${SAVE_KEY}-backup`;
const hasBackup = () => {
  try {
    return !!localStorage.getItem(BACKUP_KEY);
  } catch {
    return false;
  }
};
const reloadNoIntro = () => {
  save();
  try {
    sessionStorage.setItem('animal-rescue-skip-intro', '1');
  } catch {
    // 照載入
  }
  location.reload();
};
setAdminActions({
  popup: (t) => popup(t),
  // 🎁 Issue #14：控制面板俾武器／換皮膚／Boss 皮膚
  giveWeapon: (id) => weapons.give(id),
  wearRanger: (skin) => applyRangerSkin(thirdPerson, skin || RANGER_SKINS[0]),
  refreshPets() {
    refreshPlotPets(hub);
    if (rescue.holding) rescue.holding.name = '__refresh__'; // 手上嗰隻都換（同皮膚商店一樣）
  },
  bosses: () => bosses,
  status: () => ({ fuseDate: isFuseOpen() && !state.bigButton, kingdomDate: isNewBiomeOpen(), gymDate: isGymOpen() && !state.gymEarly && !gym.debug, gymPresent: gym.present, halloweenDate: isHalloweenOpen() && !state.halloweenEarly, meteorDate: isMeteorOpen() && !state.meteorEarly }),
  hasBackup,
  reloadNoIntro: () => {
    // 自動備份已經寫咗入 localStorage：唔好再 save() 蓋過佢
    try {
      sessionStorage.setItem('animal-rescue-skip-intro', '1');
    } catch {
      // 照載入
    }
    location.reload();
  },
  // 第一次改嘢之前：備份真存檔
  backup() {
    if (hasBackup()) return;
    save();
    try {
      localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY) || JSON.stringify(state));
    } catch {
      // 存唔到就算
    }
  },
  restore() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(BACKUP_KEY));
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      saved = null;
    }
    if (!saved) return popup('💾 No backup found.');
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, saved);
    reloadNoIntro();
  },
  unlockEarly() {
    togglePanel('admin');
    const first = !state.bigButton;
    state.bigButton = true;
    save();
    play('magic');
    announce(first ? '🔓 The FUSE MACHINE 🧪 and the ENCHANTED KINGDOM 👑 are unlocked!' : '🔓 Already unlocked! Fuse Machine and Enchanted Kingdom are open.');
    if (!state.labUnlocked) setTimeout(startUnlockScene, first ? 2500 : 400); // 以前個紅掣都會開實驗室大閘
  },
  // 控制台：去 Gym（未打 Boss 就當打贏咗：實驗室冇咗、Gym 出現；重新載入再傳送）
  gotoGym() {
    state.gymEarly = true;
    if (!gym.present) {
      Object.assign(state, { labUnlocked: true, labVisited: true, labBossDefeated: true, labEndingSeen: true });
      save();
      try {
        sessionStorage.setItem('animal-rescue-goto-gym', '1');
      } catch {
        // 冇 sessionStorage 就留喺原地
      }
      return reloadNoIntro();
    }
    save();
    togglePanel('admin');
    teleportPlayer(player, GYM_FRONT.x, GYM_FRONT.z);
    camera.rotation.set(0, Math.PI, 0, 'YXZ');
    popup('💪 Welcome to the Ranger Gym!');
  },
  // 🚀 一次過開晒所有新嘢（Fuse、魔法王國、Gym）；未打 Boss 就好似 gotoGym 咁跳過實驗室（會重新載入）
  unlockAll() {
    state.bigButton = true;
    state.gymEarly = true;
    state.halloweenEarly = true; // 🎃
    state.meteorEarly = true; // ☄️
    state.echoQuestsEarly = true; // 🐕
    if (!gym.present) return this.gotoGym();
    save();
    this.unlockEarly();
  },
  halloweenEarly(on) {
    state.halloweenEarly = on;
    save();
    popup(on ? '🎃 The HALLOWEEN WORLD is open early! Go to the portal in the middle of the Hub.' : '🎃 Halloween is back to its opening date.');
  },
  gymEarly(on) {
    state.gymEarly = on;
    save();
    popup(on ? '💪 The Ranger Gym is open early!' : '💪 The Gym is back to its opening date.');
  },
  givePet({ name, rarity, sizeMul, mutation, flipped }) {
    const a = findAnimal(name);
    if (sizeMul === 1) sizeMul = null;
    const kg = Math.max(0.1, Math.round(randomKg(a) * (sizeMul || 1) * 10) / 10);
    const pet = { name: a.name, biome: a.biome, kg, rarity: a.rarity || rarity, onPlot: false, ...(sizeMul ? { sizeMul } : {}), ...(mutation ? { mutation } : {}), ...(flipped ? { flipped: true } : {}), ...(a.fuse ? { fuse: true } : {}) };
    state.pets.push(pet);
    if (!a.fuse && !state.indexFound.includes(a.name)) state.indexFound.push(a.name);
    save();
    play('rescue');
    popup(`🎁 ${flipped ? '🙃 ' : ''}${sizeText(sizeMul) ? `${sizeText(sizeMul)} ` : ''}${mutationEmoji(pet)}${mutationEmoji(pet) ? ' ' : ''}${pet.rarity} ${a.name} is in your backpack! (${formatKg(kg)})`);
  },
  allIndex() {
    for (const a of ANIMALS) if (!state.indexFound.includes(a.name)) state.indexFound.push(a.name);
    save();
    play('magic');
    popup('📖 Your Index is complete!');
  },
  maxStuff() {
    state.treadmillLevel = MAX_TRAINING_LEVEL;
    state.tableLevel = MAX_TRAINING_LEVEL;
    state.machineLevel = MACHINE_LEVELS.length;
    state.plotLevel = PLOT_MAX_UPGRADES;
    reloadNoIntro(); // 重新載入：所有機同地塊換晒新樣
  },
  rich() {
    state.money = Math.max(state.money, 1e12);
    state.speed = Math.max(state.speed, 1e12);
    state.iq = Math.max(state.iq, 1e12);
    state.jumpPower = Math.max(state.jumpPower || 0, 300);
    save();
    play('coin');
    popup('💰 You are SUPER rich, fast, smart and bouncy!');
  },
  // 🔧 測試開關（Issue #10）：撳一下開／關
  flags: () => [
    { id: 'bigButton', label: '🧪👑 Fuse + Kingdom unlocked', on: !!state.bigButton },
    { id: 'gymEarly', label: '💪 Gym open early', on: !!state.gymEarly },
    { id: 'halloweenEarly', label: '🎃 Halloween open early', on: !!state.halloweenEarly },
    { id: 'meteorEarly', label: '☄️ Meteoric Shop open early', on: !!state.meteorEarly, hint: 'The METEORIC event still starts on its date - use the Events tab to try it now' },
    { id: 'echoQuestsEarly', label: "🐕 Echo's Quests open early", on: !!state.echoQuestsEarly, hint: 'Echo the dog: Halloween questline (opens 24 October)' },
    { id: 'world2Unlocked', label: '🔥 Halloween World 2 (Hell) unlocked', on: !!state.world2Unlocked, hint: 'Normally costs 5 🍬 Soul Candy at the World Expedition map' },
    { id: 'kingdomDebug', label: '👑 Kingdom gate open (test)', on: kingdomDebug, hint: 'Only for this visit' },
    { id: 'tutorialDone', label: '🎓 Tutorial finished', on: !!state.tutorialDone },
    { id: 'mute', label: '🔇 Sound muted', on: isMuted() },
    { id: 'hidePets', label: '🙈 Pets hidden', on: petsHidden },
  ],
  toggleFlag(id) {
    if (id === 'bigButton') state.bigButton = !state.bigButton;
    else if (id === 'gymEarly') this.gymEarly(!state.gymEarly);
    else if (id === 'halloweenEarly') this.halloweenEarly(!state.halloweenEarly);
    else if (id === 'meteorEarly') state.meteorEarly = !state.meteorEarly;
    else if (id === 'echoQuestsEarly') state.echoQuestsEarly = !state.echoQuestsEarly; // 🐕
    else if (id === 'world2Unlocked') state.world2Unlocked = !state.world2Unlocked; // 🔥
    else if (id === 'kingdomDebug') kingdomDebug = !kingdomDebug;
    else if (id === 'tutorialDone') state.tutorialDone = !state.tutorialDone;
    else if (id === 'mute') {
      toggleMute();
      showMute();
    } else if (id === 'hidePets') toggleHidePets();
    save();
  },
  // 🌍 傳送（Issue #10）：locked = 點解未去得
  places: () => [
    { id: 'hub', group: 'normal', emoji: '🏡', name: 'Hub' },
    ...BIOMES.map((b, i) => ({ id: `biome${i}`, group: 'normal', emoji: ['🌳', '🌊', '🐦', '🧊', '📦', '⛰️', '👑'][i] || '🌿', name: b.name.replace(/^Biome \d+ - /, `${i + 1}. `), locked: i === 6 && !kingdom.open ? 'Unlock the Enchanted Kingdom first' : '' })),
    { id: 'gym', group: 'secret', emoji: '💪', name: 'Ranger Gym', locked: gym.present ? '' : 'Use the Unlocks tab: Take me to the Gym' },
    { id: 'beach', group: 'secret', emoji: '🏖️', name: 'Secret Beach', locked: beach.open ? '' : 'Beat the Lab boss first' },
    { id: 'halloween', group: 'halloween', emoji: '🎃', name: 'Halloween World', locked: isHalloweenOpen() || state.halloweenEarly ? '' : 'Open Halloween early first (Unlocks tab)' },
    { id: 'ghost', group: 'halloween', emoji: '👻', name: 'Ghost World', locked: isHalloweenOpen() || state.halloweenEarly ? '' : 'Open Halloween early first (Unlocks tab)' },
    { id: 'expedition', group: 'halloween', emoji: '🗺️', name: 'World Expedition map', locked: isHalloweenOpen() || state.halloweenEarly ? '' : 'Open Halloween early first (Unlocks tab)' },
    { id: 'hell', group: 'halloween', emoji: '🔥', name: 'Hell (World 2)', locked: !(isHalloweenOpen() || state.halloweenEarly) ? 'Open Halloween early first (Unlocks tab)' : state.world2Unlocked ? '' : 'Unlock World 2 first (Unlocks tab)' },
  ],
  async teleport(id) {
    const place = this.places().find((p) => p.id === id);
    if (!place) return;
    if (place.locked) return popup(`🔒 ${place.locked}`);
    if (rescue.carrying) return popup('🐾 Bring the animal you are carrying home first!');
    togglePanel('admin');
    const inHw = inHalloween(camera.position.x, camera.position.z);
    if (id === 'halloween' || id === 'ghost' || id === 'expedition' || id === 'hell') {
      if (!inHw) await enterHalloween();
      if (!inHalloween(camera.position.x, camera.position.z)) return; // 入唔到（例如載入出錯）
      if (id === 'hell') return travelToHell(); // 🔥
      if (id === 'expedition') return travel(EXPEDITION_SPOT.x, EXPEDITION_SPOT.z, EXPEDITION_SPOT.rotY, '🗺️ The World Expedition map!');
      if (id === 'ghost') {
        forceTrain(); // 有車先留得低（冇車會即刻送返火車站）
        travel(GHOST_ARRIVE.x, GHOST_ARRIVE.z, GHOST_ARRIVE.rotY, '👻 The GHOST WORLD!');
      } else travel(HW_ARRIVE.x, HW_ARRIVE.z, HW_ARRIVE.rotY, '🎃 The Halloween World!');
      return;
    }
    if (inHw) {
      halloween.sky = 0; // 返普通世界：天空變返正常、收魚竿
      stopFishing(fishing);
    }
    if (id === 'beach') return goToBeach();
    if (id === 'hub') return travel(FOUNTAIN.x, FOUNTAIN.z - 8, 0, '🏡 The Hub!');
    if (id === 'gym') return travel(GYM_FRONT.x, GYM_FRONT.z, Math.PI, '💪 The Ranger Gym!');
    const i = Number(id.slice(5));
    if (dayNight.isNight) dayNight.offset += Math.ceil(dayNight.timeLeft * 1000) + 50; // 夜晚生態區落閘：直接跳去白天
    if (i === 6) {
      travel(0, KINGDOM_STAIRS.z - 6, 0, `👑 ${BIOMES[i].name}`);
      player.feetY = KINGDOM_STAIRS.top;
      return;
    }
    travel(0, -i * BIOME_LENGTH - 6, 0, `${place.emoji} ${BIOMES[i].name}`);
  },
  // 🌗 即刻夜晚／白天（改 dayNight.offset，同 game.dayNight 測試一樣）
  skipTime(which) {
    togglePanel('admin');
    if (which === 'night' && !dayNight.isNight && camera.position.z < 0 && !inHalloween(camera.position.x, camera.position.z) && rescue.carrying) return popup('🐾 Bring your animal home first, or it runs away at night!');
    if (which === 'night' && !dayNight.isNight) dayNight.offset += Math.ceil(dayNight.timeLeft * 1000) + 50;
    if (which === 'day' && dayNight.isNight) dayNight.offset += Math.ceil(dayNight.timeLeft * 1000) + 50;
  },
  event(id) {
    togglePanel('admin');
    forceEvent(id);
  },
  // 🗼 控制台：直接入 Witch Tower（唔理女巫／World 2 鎖），floor = 由第幾層開始（塔入面就即刻跳去嗰層）
  async tower(mode = 'medium', floor = 1) {
    togglePanel('admin');
    if (tower.inside) return tower.debug.floor(floor);
    if (rescue.carrying) return popup('🐾 Bring the animal you are carrying home first!');
    if (!inHalloween(camera.position.x, camera.position.z)) await enterHalloween();
    if (!inHalloween(camera.position.x, camera.position.z)) return;
    return tower.enter(mode, floor);
  },
  reaper() { // 🐉 控制台：召喚 Pumpkin Reaper Dragon（5 秒紅色警告，之後醒）
    togglePanel('admin');
    reaper.debug.spawn(5);
    popup('🐉 The Pumpkin Reaper Dragon wakes up in 5 seconds! Go to the Abandoned Manor door.');
  },
  train() { // 🚂 控制台：即刻嚟一班 Phantom Express
    togglePanel('admin');
    forceTrain();
    popup('🚂 The Phantom Express is coming to the Halloween Train Station now!');
  },
  crazy() {
    togglePanel('admin');
    pressCrazy(crazy, rescue);
  },
  spawn(biome, rarity) {
    if (biome === 6 && !kingdom.open) return popup('👑 Unlock the Enchanted Kingdom first (Future tab)!');
    const pool = animalsInBiome(biome);
    const fixed = pool.filter((a) => a.rarity);
    const animal = fixed.length ? fixed.find((a) => a.rarity === rarity) : null;
    if (fixed.length && !animal) return popup(`No ${rarity} animal lives in ${BIOMES[biome].name}.`);
    if (!fixed.length && rarity === 'Eternal') return popup('Eternal animals only live in the Enchanted Kingdom.');
    const w = spawnAnimal(rescue, biome, animal, null, rarity);
    togglePanel('admin');
    if (w) announceSpecials([w]);
    popup(w ? `✨ A ${w.rarity} ${w.animal.name} appeared in ${BIOMES[biome].name}!` : 'Could not spawn it, try again.');
  },
});

// 球棒：揮一下（打中就計一下）
let batSwing = 0;
function swingBat() {
  batSwing = 0.25;
  play('swoosh');
  if (batHit(fight, { x: camera.position.x, z: camera.position.z, inside: true })) popup('🏏 SMACK!');
}

// 撳滑鼠左鍵（拎住鎚仔）都打得爛玻璃艙；拎住球棒就揮棒
window.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || isPaused() || !player.controls.isLocked) return;
  if (selectedHotbarItem()?.item.weapon) return; // 🔫 射嘢：weapons.js 自己聽滑鼠
  if (halloween.inside && hwWorld && fishingPress(fishing, camera.position, fishUI)) return; // 🎣 click = 拋竿／上鈎／收線
  if (selectedHotbarItem()?.item.bat) {
    swingBat();
    return;
  }
  if (selectedHotbarItem()?.kind === 'gear') return inventory.useGear(selectedHotbarItem().item.gear, true); // ⚙️（寶箱：撳一下開一個）
  if (!holdingHammer()) return;
  const it = labInteraction(camera.position);
  if (it?.action && lab.pods.some((p) => !p.free && near(camera.position, p, 3.6))) it.action();
});

// 入傳送門 → 圓形 Boss Arena；出口 → 返實驗室
function flashScreen() {
  const el = document.getElementById('movie-blink');
  document.getElementById('movie').hidden = false;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(() => {
    if (!movie.active) document.getElementById('movie').hidden = true;
  }, 400);
}
function enterArena() {
  flashScreen();
  play('portal');
  teleportPlayer(player, ARENA_START.x, ARENA_START.z);
  camera.rotation.set(0, 0, 0, 'YXZ'); // 望住北邊（Boss）
  announce('⚔️ The BOSS ARENA!');
  safeTime = 2;
}
function leaveArena(text) {
  flashScreen();
  play('portal');
  teleportPlayer(player, LAB_RETURN.x, LAB_RETURN.z);
  camera.rotation.set(0, 0, 0, 'YXZ');
  if (text) announce(text);
  safeTime = 2;
}

function cleanTrash(trash) {
  trash.group.visible = false;
  trash.back = time + 180; // 3 分鐘之後又有人亂拋
  state.money += TRASH_REWARD;
  play('coin');
  popup(`♻️ You cleaned up a ${trash.name}! +$${TRASH_REWARD}`);
  save();
}

// ---- 🎃 Halloween 世界：傳送門 + 載入畫面 ----
let hwTravelling = false;
async function enterHalloween() {
  if (hwTravelling || rescue.carrying) return;
  hwTravelling = true;
  play('portal');
  const ok = await showLoading(hwWorld ? '🎃 Entering the Halloween World...' : '🎃 Building the Halloween World...', async (progress) => {
    if (!hwWorld) hwWorld = await buildHalloween(scene, progress);
    if (!hwEggs) hwEggs = createHalloweenEggs(scene, camera, { teleport: (x, z) => { teleportPlayer(player, x, z); camera.rotation.set(0, 0, 0, 'YXZ'); } });
    if (!echo) echo = createEchoShop({ scene, openShop: () => togglePanel('echo'), popup }); // 🐕
    if (!echoQuests) echoQuests = createEchoQuests({ scene, openPanel: () => togglePanel('echoQuests'), popup, announce }); // 🐾
    if (!expedition) expedition = createExpedition({ scene, openPanel: () => togglePanel('expedition'), closePanel: () => togglePanel('expedition'), travel: () => travelToHell(), popup, announce }); // 🗺️
    teleportPlayer(player, HW_ARRIVE.x, HW_ARRIVE.z);
    camera.rotation.set(0, HW_ARRIVE.rotY, 0, 'YXZ');
    halloween.sky = 1; // 一出現就係恐怖天空（唔使慢慢變）
  }, 1.8, { theme: 'halloween', title: 'Halloween World' });
  hwTravelling = false;
  if (!ok) return; // 出錯：載入畫面已經彈咗出錯卡
  play('spooky');
  announce('🎃 Welcome to the HALLOWEEN WORLD! 👻');
  setTimeout(() => popup('⭕ The Spawn Ruins are a SAFE ZONE. Bosses cannot come in!'), 2500);
}
async function leaveHalloween() {
  if (hwTravelling) return;
  hwTravelling = true;
  play('portal');
  const ok = await showLoading('🌀 Going back to the Hub...', async () => {
    teleportPlayer(player, FOUNTAIN.x, FOUNTAIN.z - 8);
    camera.rotation.set(0, 0, 0, 'YXZ');
    halloween.sky = 0;
  }, 1.2, { theme: 'nature', kicker: 'Going back to', title: 'Animal Rescue Park' });
  hwTravelling = false;
  if (!ok) return;
  stopFishing(fishing); // 🎣 返普通世界：收線（魚竿留低，Issue #8 #9）
  announce('🏡 Back at the Animal Rescue Park!');
}

// ---- 🔥 Halloween World 2：Hell（Issue #11）----
// 傳送去某個高度（石台上面）：teleportPlayer 會將腳放返 0，所以之後再擺高
function placePlayer(x, y, z, rotY = null) {
  teleportPlayer(player, x, z);
  player.feetY = y;
  camera.position.y += y;
  if (rotY !== null) camera.rotation.set(0, rotY, 0, 'YXZ');
}
async function ensureHell(progress = () => {}) {
  if (!hell) hell = await buildHell(scene, progress, {
    place: placePlayer, popup, announce, play,
    openWitch: () => togglePanel('witch'), closeWitch: () => togglePanel('witch'),
    openPanel: (kind) => togglePanel(kind), equipRanger: (skin) => applyRangerSkin(thirdPerson, skin), // 🌳 Skill Tree／🛒 Castle Shop（Issue #14）
    goBack: () => leaveHell(),
  });
  return hell;
}
async function travelToHell() {
  if (hwTravelling) return;
  if (!state.world2Unlocked) return popup('🔒 Unlock World 2 at the 🗺️ World Expedition map first!');
  if (rescue.carrying || hwEggs?.isCarrying()) return popup('🥚 Take what you are carrying to the Spawn Ruins first!');
  hwTravelling = true;
  play('portal');
  const ok = await showLoading(hell ? '🔥 Travelling to Hell...' : '🔥 Building Hell...', async (progress) => {
    await ensureHell(progress);
    placePlayer(HELL_ARRIVE.x, HELL_START.top, HELL_ARRIVE.z, HELL_ARRIVE.rotY);
    hell.arrive();
    halloween.sky = 1;
  }, 2, { theme: 'hell', title: 'Hell', kicker: '🔥 World 2 · Travelling to' });
  hwTravelling = false;
  if (!ok) return;
  play('rumble');
  announce('🔥 Welcome to HELL! 🔥');
  setTimeout(() => popup('🪨 Jump across the flying lava rocks to reach the 🏰 Witch Castle!'), 2300);
}
async function leaveHell() {
  if (hwTravelling) return;
  hwTravelling = true;
  play('portal');
  const ok = await showLoading('🎃 Back to the Halloween World...', async () => {
    teleportPlayer(player, HW_ARRIVE.x, HW_ARRIVE.z);
    camera.rotation.set(0, HW_ARRIVE.rotY, 0, 'YXZ');
  }, 1.2, { theme: 'halloween', kicker: 'Going back to', title: 'Halloween World' });
  hwTravelling = false;
  if (ok) announce('🎃 Back in the Halloween World!');
}
// 🗼 Witch Tower：塔門撳 E → 揀難度面板（src/witchTower.js）
setWitchTowerEntry(() => tower.openModes());
// 打完／暈低：返去 Witch Castle 庭園（塔門前面，望住庭園）；控制台直接入塔嘅話 Hell 未起，就順手起埋
async function towerToCastle() {
  const go = () => {
    placePlayer(TOWER_DOOR.x - 8, CASTLE_TOP, TOWER_DOOR.z, -Math.PI / 2); // 望住塔門（第三身鏡頭唔會擠埋入發光道門度）
    hell.setCheckpoint(HELL_LAST_CP); // 跌落熔岩都係返城堡
    halloween.sky = 1;
  };
  if (hell) {
    flashScreen();
    go();
    return;
  }
  await showLoading('🏰 Back to the Witch Castle...', async (progress) => {
    await ensureHell(progress);
    go();
  }, 1.2, { theme: 'hell', title: 'Witch Castle', kicker: '🔥 World 2 · Going back to' });
}

// ---- 秘密沙灘 ----
function travel(x, z, rotY, text) {
  flashScreen();
  play('portal');
  teleportPlayer(player, x, z);
  camera.rotation.set(0, rotY, 0, 'YXZ');
  announce(text);
}
// 去秘密沙灘：第一次去先播 Owner 俾錢、流星嗰段（小朋友 2026-10-18：爆炸之後先見到 Gym，傳送門喺 Gym 門外）
function goToBeach() {
  if (!state.beachFinaleSeen && !endingRunning) {
    endingRunning = true;
    player.controls.unlock();
    closePanel();
    flashScreen();
    play('portal');
    beachFinale();
    return;
  }
  travel(BEACH_ARRIVE.x, BEACH_ARRIVE.z, -Math.PI / 2, '🏖️ The Secret Beach!');
}
let sitting = false;
function sitDown() {
  sitting = true;
  camera.rotation.set(0.35, -Math.PI / 2, 0, 'YXZ'); // 望向海同天空
  play('click');
  popup('🌠 Look up! Meteors are falling over the ocean...');
}
function standUp() {
  sitting = false;
  teleportPlayer(player, BENCH.x - 1.6, BENCH.z);
  play('click');
}
function startCollab() {
  sitting = false;
  player.controls.unlock();
  closePanel();
  beach.collab = true;
  playCollab({
    scene, camera, skinId: state.rangerSkin, playMovie, once: movieOnce, shake: movieShake, play,
    onDone() {
      beach.collab = false;
      const first = !state.collabSeen;
      state.collabSeen = true;
      save();
      teleportPlayer(player, STRANGER.x - 4, STRANGER.z - 3);
      announce(first ? '🤝 You found the SECRET ENDING: THE COLLAB!' : '🤝 THE COLLAB');
      resume();
    },
  });
}

function interact() {
  const it = currentInteraction();
  if (it?.action) it.action();
}

function borrowAnimal(w) {
  borrow(rescue, w);
  play('borrow');
  // 小朋友 2026-10-18：借咗即刻俾 Boss 捉到（佢企得好近）→ 俾你 3 秒先走
  const boss = bosses[w.biome];
  if (boss) {
    boss.grace = BORROW_HEAD_START;
    setTimeout(() => popup(`⚠️ ${boss.info.name} noticed! You have a ${BORROW_HEAD_START}-second head start - RUN!`), 900);
  }
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

// Boss 撞到你：唔使答問題，直接彈飛返 Hub（小朋友 2026-10-15）；抱住嘅動物走返去生態區
// ---- Eclipse 日蝕 ----
function startEclipseIntro() {
  if (intro.active || movie.active) return; // 播緊其他片：淨係變天
  player.controls.unlock();
  closePanel();
  // Issue #14：片段郁鏡頭 = 郁玩家（第一身鏡頭就係玩家位置）。以前播完冇擺返玩家，
  // 會留咗喺最後一個鏡頭位 (30, 60) —— Hub 圍牆外面、行唔到嘅地方 → 貼住牆郁唔到。
  // 而家：開始前記低位置、高度、望邊度，播完（或者跳過）擺返原位
  const back = { x: camera.position.x, z: camera.position.z, feetY: player.feetY, rot: camera.rotation.clone() };
  playEclipseIntro({
    ec: eclipse, camera, playMovie, once: movieOnce, shake: movieShake, play,
    onDone: () => {
      if (isWalkable(back.x, back.z, 0.35, back.feetY)) placePlayer(back.x, back.feetY, back.z);
      else teleportPlayer(player, 0, 14); // 萬一原位行唔到：返 Hub 中間
      camera.rotation.copy(back.rot);
      resume();
    },
  });
}
// 揀激光打邊度：地塊寵物、野生動物，或者你附近（小心！）
function eclipseTarget() {
  const pos = camera.position;
  const roll = Math.random();
  const plot = hub.plot.pets.filter((p) => !hasMutation(p.pet, 'eclipse'));
  if (roll < 0.45 && plot.length) {
    const p = plot[Math.floor(Math.random() * plot.length)].group.position;
    return { pos: p.clone(), groundY: 0 };
  }
  const wild = rescue.wild.filter((w) => !hasMutation(w, 'eclipse'));
  if (roll < 0.7 && wild.length) {
    const w = wild[Math.floor(Math.random() * wild.length)];
    return { pos: w.group.position.clone(), groundY: groundAt(w.group.position.x, w.group.position.z, 999) };
  }
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 4;
  const p = new THREE.Vector3(pos.x + Math.cos(a) * r, 0, pos.z + Math.sin(a) * r);
  return { pos: p, groundY: groundAt(p.x, p.z, player.feetY + 0.5) };
}
function eclipseStrike(at) {
  play('hit');
  const near = (p) => Math.hypot(p.x - at.x, p.z - at.z) < STRIKE_RADIUS + 0.6;
  // 地塊寵物：70% 機會變 🌑 ECLIPSE（Fire 寵物唔會變）
  const hit = hub.plot.pets.filter((p) => !hasMutation(p.pet, 'eclipse') && near(p.group.position) && Math.random() < 0.7).map((p) => p.pet);
  for (const pet of hit) pet.mutation = addMutation(pet, 'eclipse'); // Fire 寵物都可以疊埋 Eclipse
  if (hit.length) {
    refreshPlotPets(hub);
    announce(`🌑 ECLIPSE MUTATION! Your ${hit.map((p) => p.name).join(' and ')} earn${hit.length > 1 ? '' : 's'} x6 money!`);
    play('tierUp');
    save();
  }
  // 野生動物：救返嚟、繁殖出嚟都係 Eclipse
  for (const w of rescue.wild) {
    if (hasMutation(w, 'eclipse') || !near(w.group.position)) continue;
    w.mutation = addMutation(w, 'eclipse');
    addFireAura(w.model, 'eclipse');
    popup(`🌑 The wild ${w.animal.name} got the ECLIPSE mutation! Rescue it!`);
  }
  // 你：彈飛返 Hub（抱住嘅動物唔會走）
  if (near(camera.position) && player.feetY - groundAt(camera.position.x, camera.position.z, player.feetY + 0.5) < 1.5 && !fling) {
    play('boing');
    announce('💥 The ECLIPSE laser hit you! You flew back to the Hub!');
    const from = camera.position.clone();
    fling = { from, to: new THREE.Vector3(0, from.y, 14), t: 0, dur: 1.8 };
    safeTime = 99;
  }
}

function onBossCatch(boss) {
  play('hit');
  play('boing');
  sendBossHome(boss);
  if (rescue.carrying) {
    const animal = loseAnimal(rescue);
    setCarrying(null);
    announce(`💥 ${boss.info.name} sent you flying! The ${animal.name} ran back to its biome.`);
  } else announce(`💥 ${boss.info.name} sent you flying back to the Hub!`);
  const from = camera.position.clone();
  fling = { from, to: new THREE.Vector3(0, from.y, 14), t: 0, dur: 1.8 };
  safeTime = 99; // 飛緊唔會再撞
}
let fling = null; // 彈飛緊：{ from, to, t, dur }

// Issue #2：實驗室 Boss 戰俾嘢打中 → 同其他 Boss 一樣彈飛，但係落返實驗室門口（唔使由 Hub 行返嚟）
function onLabHit(what) {
  play('hit');
  play('boing');
  // Issue #4：玩家唔會扣血，俾打中只係彈返起點
  const who = `${what[0].toUpperCase()}${what.slice(1)}`;
  announce(`💥 ${who} sent you flying!`);
  const from = camera.position.clone();
  fling = { from, to: new THREE.Vector3(ARENA_START.x, from.y, ARENA_START.z), t: 0, dur: 1.2 };
  safeTime = 99;
}

// 每格畫面：沿住拋物線飛返 Hub，轉吓轉吓
function updateFling(dt) {
  fling.t += dt;
  const k = Math.min(1, fling.t / fling.dur);
  camera.position.lerpVectors(fling.from, fling.to, k);
  camera.position.y += Math.sin(k * Math.PI) * (12 + fling.from.distanceTo(fling.to) * 0.15);
  camera.rotation.z = Math.sin(k * Math.PI * 4) * 0.3 * (1 - k);
  if (k >= 1) {
    teleportPlayer(player, fling.to.x, fling.to.z);
    camera.rotation.z = 0;
    fling = null;
    safeTime = 2;
    play('pop');
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
  refillCrazy(crazy, rescue);
}
const seededPick = (text) => [...text].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7) / 4294967296;
function handleEvents() {
  const { started, ended, tick, tickNo, status } = updateEvents();
  const tag = `${status.key}-${started?.id ?? status.ev.id}`;
  if (ended && !started) {
    if (['giant', 'rare', 'troll'].includes(lastEventId)) respawnWild(); // 變返呢段白天嘅正常動物
    if (lastEventId === 'troll') announce('🤡 TROLL FRENZY is over! The Bosses are back to normal.');
    if (lastEventId === 'eclipse') announce('🌞 The ECLIPSE is over! The sun is back.');
    popup('The event is over! See you at the next one!');
  }
  if (started) {
    announce(`${started.emoji} EVENT: ${started.name}!`);
    setTimeout(() => popup(started.desc), 1500);
    play('magic');
    const prev = lastEventId;
    if (started.id === 'giant') respawnWild(false, `${tag}-t${tickNo}`);
    else if (started.id === 'rare' || started.id === 'troll') respawnWild(true, tag); // Troll Frenzy：好稀有嘅寵物（但 Boss 快 1,000,000 倍！）
    else if (['giant', 'rare', 'troll'].includes(prev)) respawnWild(); // 由巨型轉去其他活動：變返正常
    if (started.id === 'troll') setTimeout(() => popup('🤡 The Bosses are 1,000,000x FASTER! Rescue if you dare...'), 3200);
    if (started.id === 'eclipse') startEclipseIntro();
  }
  if (started) lastEventId = started.id;
  if (tick) respawnWild(false, `${tag}-t${tickNo}`); // Giant Pets：每 30 秒換一批
}
let lastEventId = null;
let revealWait = 0; // 開門動畫：等玩家入咗遊戲 1.5 秒先播

// ================= Issue #2：開門動畫 =================
// 收完寵物：Skin Tokens、任務、公告（第一隻寵物出世動畫播完先做）
function afterCollect(pets) {
  const tokens = pets.reduce((n, p) => n + (PET_TOKENS[p.rarity || 'Common'] || 1), 0);
  state.tokens += tokens; // 每隻新寵物都有 Skin Tokens（越稀有越多）
  setTimeout(() => popup(`🎟️ +${tokens} Skin Tokens`), 1200);
  quest('pets', pets.length);
  const giant = pets.find((p) => p.sizeMul > 1);
  // Issue #14：繁殖機唔再出 🔥 Fire；☄️ Meteoric Dragon's Lair 有機會出 ☄️ Meteoric
  const meteoric = pets.find((p) => newlyMeteoric.has(p));
  if (meteoric) announce(`☄️☄️ METEORIC MUTATION! Your ${meteoric.name} glows blue: x${mutationInfo('meteoric').money} money! 🐉`);
  else announce(giant ? `🔥 GIANT x${giant.sizeMul} ${giant.name}!` : `🎉 You got ${pets.map((p) => `a ${p.name}`).join(' and ')}!`);
  play(giant || meteoric ? 'tierUp' : 'ding');
  popup('Put it on your Plot to earn money!');
  save();
}

function startUnlockScene() {
  player.controls.unlock();
  closePanel();
  playUnlockScene({
    scene, camera,
    onDone() {
      // 播完：企喺大門前面，望住大門（+z）
      teleportPlayer(player, 0, 50);
      camera.rotation.set(0, Math.PI, 0, 'YXZ');
      announce('🔓 The gate is open! Follow the green arrows to the 🔬 Laboratory!');
      play('magic');
      resume();
    },
  });
}

// ================= Issue #2：結局動畫 =================
// 打贏 Boss 之後嘅結局（小朋友 Issue #4 之後再改）：
// 1. Arena：Boss 瞓低、動物醒咗走出傳送門 → 2. 實驗室爆炸，你走得切 → 3. 去到秘密沙灘，Owner 俾你錢 → 黑畫面 → 喺沙灘繼續玩
let endingRunning = false;
function startEnding() {
  if (endingRunning) return;
  endingRunning = true;
  player.controls.unlock();
  closePanel();
  playEnding({
    scene, camera, fight, short: true,
    onDone: () => playLabEscape({ scene, camera, onDone: afterEscape }),
  });
}
// 爆炸之後：企喺前院，望住新 Gym（OPENING SOON）同門外嘅傳送門
function afterEscape() {
  endingRunning = false;
  state.labEndingSeen = true;
  hideBoss(fight);
  fight.phase = 'gone';
  save();
  labStatus.gone = true;
  teleportPlayer(player, GYM_FRONT.x, GYM_FRONT.z);
  camera.rotation.set(0, Math.PI - 0.35, 0, 'YXZ'); // 望向 Gym 大門（+z），少少望住左邊嘅傳送門
  announce(isGymOpen() ? '💪 The RANGER GYM is open! Go in and train!' : `💪 The RANGER GYM opens on ${gymOpenDateText()}!`);
  setTimeout(() => popup('🌀 Walk to the glowing portal and press E to visit the SECRET BEACH 🏖️'), 2600);
  play('day');
  resume();
}
function beachFinale() {
  const animals = ENDING_ANIMALS.map((name) => {
    const model = buildAnimalModel(findAnimal(name));
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(Math.min(1.4, 2.2 / Math.max(size.x, size.y, size.z)));
    return model;
  });
  beach.collab = true; // 星空
  playBeachFinale({
    scene, camera, playMovie, once: movieOnce, play, owner: park.owner, standUp: ownerStandUp, ranger: state.rangerSkin, animals, reward: LAB_REWARD,
    onPaid() {
      // Owner 俾你 $1000（只俾一次）
      if (state.labRewardPaid) return;
      state.labRewardPaid = true;
      state.money += LAB_REWARD;
      popup(`💰 +$${short(LAB_REWARD)}`);
      save();
    },
    onDone() {
      beach.collab = false;
      endingRunning = false;
      state.labEndingSeen = true;
      state.beachFinaleSeen = true;
      hideBoss(fight);
      fight.phase = 'gone';
      lieOnHammock();
      save();
      // 喺秘密沙灘繼續玩
      teleportPlayer(player, BEACH_ARRIVE.x, BEACH_ARRIVE.z);
      camera.rotation.set(0, -Math.PI / 2, 0, 'YXZ');
      announce('🏖️ Welcome to the SECRET BEACH! Sit on the bench to watch the meteors 🌠');
      play('day');
      resume();
    },
  });
}

// 睇片：停背景音樂 + 讀片（離開跑步機／暫停就回復）
function watchVideos(on) {
  const screen = hub.stations.find((st) => st.video)?.video;
  if (!screen) return;
  screen.setWatching(on, isMuted());
  setMusicPaused(on);
}

// ================= 主迴圈 =================

let pausedSince = 0; // 幾時開始暫停（0 = 冇暫停）
const timer = new THREE.Timer();
let time = 0;
let wasTraining = null;
let wasGym = null;
let lastStep = 0;
let lastLocation = null;

let booted = false; // 第一格畫好先收起第一次嘅載入畫面
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = Math.max(0, Math.min(timer.getDelta(), 0.1)); // 卡機都唔好一下飛太遠；第一格個 timer 可能倒退（負數）→ 隕石閃光同震動會越變越大（藍色畫面震，小朋友 2026-10-23）
  time += dt;

  // 暫停：成個世界停低（開場動畫除外）；繁殖機倒數都暫停（返嚟時補返暫停咗嘅時間）
  const frozen = isPaused() && !intro.active && !movie.active;
  if (frozen) {
    if (!pausedSince) pausedSince = Date.now();
  } else if (pausedSince) {
    const pausedFor = Date.now() - pausedSince;
    for (const rec of state.machines) if (rec && rec.endsAt > pausedSince) rec.endsAt += pausedFor;
    pausedSince = 0;
  }
  if (!frozen) {
    updateWorld(dt, time); // 水、雀、雪
    animateSkins(time); // 寵物皮膚特效
    animateFireAuras(time); // 🔥 Fire 寵物嘅火
  }
  const pos = camera.position;
  updateIntro(intro, dt);
  updateMovie(dt);
  if (!frozen) updateLab(dt, time, pos);
  beach.open = !!state.labBossDefeated; // 小朋友：打完 Boss 先見到秘密沙灘
  // 💪 Gym：打完 Boss（實驗室爆炸）先見到；GYM_OPEN_DATE 到咗先行得入去
  // 小朋友 2026-10-18：實驗室爆咗就冇咗，Gym 喺原位（labStatus.gone：開機時睇存檔；爆炸動畫入面煙最濃嗰下設定）
  setGymPresent(labStatus.gone);
  gymArea.open = gym.present && isGymOpen();
  if (!frozen) updateGym(dt, time, pos);
  // Biome 7：NEW_BIOME_DATE 到咗先開；第一次行到閘門前面就播開門動畫
  // 小朋友 2026-10-18：倒數到 0（或者提早開咗）→ 未睇過開門動畫嘅玩家一入遊戲就會播（喺邊度都得）；行到閘門前面都即刻播
  const kingdomReady = isNewBiomeOpen() || kingdomDebug || state.bigButton;
  kingdom.open = kingdomReady && (state.kingdomSeen || movie.active);
  const atKingdomGate = pos.z < KINGDOM_STAIRS.z + 9 && player.feetY > 10;
  const revealOk = kingdomReady && !state.kingdomSeen && !movie.active && !intro.active && startScreen.hidden && !isPanelOpen() && !isQuizOpen()
    && !document.getElementById('device-chooser') && !rescue.carrying && !endingRunning && whereIs(pos.x, pos.z) !== 'Boss Arena'
    && (state.tutorialDone || atKingdomGate);
  revealWait = revealOk ? revealWait + dt : 0;
  if (revealOk && (atKingdomGate || revealWait > 1.5)) {
    revealWait = 0;
    const back = { x: pos.x, z: pos.z, feetY: player.feetY, rotY: camera.rotation.y };
    player.controls.unlock();
    closePanel();
    playKingdomReveal({
      camera, playMovie, once: movieOnce, shake: movieShake, play, gate: KINGDOM_GATE,
      onDone() {
        state.kingdomSeen = true;
        save();
        if (atKingdomGate) {
          teleportPlayer(player, 0, KINGDOM_STAIRS.z + 3);
          player.feetY = KINGDOM_STAIRS.top;
          camera.rotation.set(0, 0, 0, 'YXZ');
          announce('👑 The ENCHANTED KINGDOM is open! Go down the royal stairs!');
        } else {
          // 喺第二度播：返返去原本個位
          teleportPlayer(player, back.x, back.z);
          player.feetY = back.feetY;
          camera.rotation.set(0, back.rotY, 0, 'YXZ');
          announce('👑 The ENCHANTED KINGDOM is open! Climb the Mining Mountain and cross the bridge to the gate!');
        }
        resume();
      },
    });
  }
  beach.inside = whereIs(pos.x, pos.z) === 'Secret Beach' || (movie.active && beach.collab);
  if (!frozen) updateBeach(dt, time);
  updateStatueButton(statueBtn, dt);
  if (!frozen) updateCrazy(crazy, dt, rescue, () => rescue.wild.forEach((w) => (w.crazy = false))); // 完咗：唔再補；剩低嗰啲留到下次入夜
  updateEclipse(eclipse, frozen ? 0 : dt, time, { active: boost.eclipse, playing: !isPaused(), camera, pickTarget: eclipseTarget, onStrike: eclipseStrike, onWarn: () => play('alarm') });
  updateMeteor(meteor, frozen ? 0 : dt, time, { camPos: camera.position, feetY: player.feetY, quality: quality.level, playing: !isPaused() && !movie.active && !intro.active, bosses });

  hub.night = dayNight.isNight; // 夜晚繁殖機 10 倍速
  if (isPaused()) {
    updateHub(hub, 0, time, Infinity, Infinity); // 暫停：唔訓練唔賺錢，但啲牌照畫
    watchVideos(false);
  } else {
    const station = trainingStationAt(hub, pos.x, pos.z);
    if (station && station !== wasTraining) {
      popup(`${station.statKey === 'speed' ? '🏃' : '📚'} Training ${station.stat}!`);
      if (station.video) setTimeout(() => popup('🖱️ Scroll to watch funny videos!'), 1300);
    }
    wasTraining = station;
    // 💪 Gym 嘅機
    const gymStation = station ? null : gymStationAt(pos.x, pos.z);
    if (gymStation && gymStation !== wasGym) popup(gymStation.enterText);
    wasGym = gymStation;
    // 企喺跑步機：睇片，背景音樂停、AI 聲讀片（小朋友 2026-10-17）
    watchVideos(!!station?.video);

    if (fling) updateFling(dt);
    else if (sitting) camera.position.set(BENCH.x + 0.05, 1.75, BENCH.z); // 坐喺長櫈睇流星
    else updatePlayer(player, dt, station ? station.standHeight : gymStation ? gymStation.standHeight : 0);
    // 🦘 彈床：一落地就自動彈返上去（跳得越高越好玩）
    if (gymStation?.kind === 'trampoline' && player.grounded) {
      player.vy = jumpVelocity(Math.max(3.2, jumpHeight() * 1.35));
      player.grounded = false;
      gym.bounce = 1;
      play('boing');
    }
    // 🦸 Cosmic Meteor Ranger：落地單膝跪地 + 衝擊波（要喺彈床之後，彈床唔算落地）
    updateCosmicLanding(superLand, dt, { player, camera, tp: thirdPerson, on: state.rangerSkin === 'cosmic', ready: !intro.active && !movie.active, play });
    updateDemonicRanger(demonicFx, dt, { player, camera, tp: thirdPerson, on: state.rangerSkin === 'demonic', ready: !intro.active && !movie.active, play }); // 😈 要喺讀 player.jumped 之前
    const gymGains = trainInGym(gymStation, dt);
    if (gymGains.length) {
      quest('train', 1);
      popup(gymGains.map((g) => `+${short(g.amount)} ${g.label}`).join('  '));
      play('blip');
    }
    const { trained, earned } = updateHub(hub, dt, time, pos.x, pos.z);
    if (earned) quest('money', earned);
    if (trained) {
      quest('train', 1);
      popup(`+${short(trained.amount)} ${trained.station.stat}`);
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
      if (reward) extra += `<br>📖 New species in your Index! +$${short(reward)}`;
      if (biomeBonus) extra += `<br>🏆 Biome complete! +$${short(biomeBonus)}`;
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
    setSightings(inHalloween(pos.x, pos.z) ? [] : rescue.wild.filter((w) => w.special && (w.biome !== 6 || kingdom.open)), camera); // Biome 7 未開唔好講；🎃 Halloween 世界入面唔講普通世界嘅動物
    // 背景音樂跟住情況轉：俾 Boss 追 > 夜晚 > 生態區 > Hub
    const labHit = updateLabFight(fight, dt, time, {
      x: pos.x, z: pos.z, feetY: player.feetY, inside: location === 'Boss Arena', safe: safeTime > 0 || !!fling || labDebug.god,
    });
    if (labHit) onLabHit(labHit);
    const labBattle = location === 'Boss Arena' && !['sleep', 'gone', 'defeated'].includes(fight.phase);
    if (bosses.some((b) => b.mode === 'chase') || labBattle || reaper.battle || tower.battle) setMusicMood('boss'); // 🐉 Reaper 大廳都係 Boss 音樂
    else if (inHalloween(pos.x, pos.z)) setMusicMood(inGhostWorld(pos.x, pos.z) || inHell(pos.x, pos.z) ? 'ghost' : 'spooky'); // 🔥 Hell 都用恐怖啲嗰首 // 🎃 Halloween 世界日夜都係呢首；👻 Ghost World 更恐怖嗰首
    else if (dayNight.isNight) setMusicMood('night');
    else setMusicMood(location === 'Hub' || location === 'Gym' ? 'hub' : 'biome');
    if (safeTime <= 0 && caught) onBossCatch(caught);
    else if (safeTime <= 0) {
      const hit = hazardHit(hazards, pos.x, pos.z, player.feetY); // 跳高啲就跳得過
      if (hit) onHazardHit(hit);
    }

    // Issue #2：圖鑑夠 25 隻 → 播開門動畫（喺 Hub 先播，唔會喺俾 Boss 追緊嗰陣播）
    // 行入開咗嘅傳送門 → Boss Arena；Arena 出口 → 返實驗室
    if (!fling && location === 'Laboratory' && portalReady() && !state.labBossDefeated && Math.hypot(pos.x - PORTAL.x, pos.z - PORTAL.z) < 2.6) enterArena();
    if (!fling && location === 'Boss Arena' && Math.hypot(pos.x - EXIT_PORTAL.x, pos.z - EXIT_PORTAL.z) < 2) leaveArena(fight.phase === 'gone' ? '' : '🏃 You left the arena. Come back when you are ready!');
    // 打贏咗（Boss 跌低咗 3 秒之後）→ 播結局
    if (state.labBossDefeated && !state.labEndingSeen && !fling && !(fight.phase === 'defeated' && fight.t < 3)) startEnding();
    if ((location === 'Laboratory' || location === 'Boss Arena') && !state.labVisited) {
      state.labVisited = true; // 入咗實驗室：唔使再指路
      save();
    }
    updateTutorial(tutorial, time);
    const it = currentInteraction();
    setPrompt(it?.prompt ?? null);
    updateBossSigns(state.speed, state.iq);
    dayNight.forceDusk = location === BIOMES[3].name; // Issue #2：Arctic Meltdown 永遠係黃昏天（夜晚照樣入夜）
    updateDayNight(dayNight, dt);
    handleEvents(); // 要喺 updateDayNight 之後：活動同入夜同一刻開始（整點／半點），活動嘅動物先唔會俾入夜 spawnAll 蓋咗
    applyBeachSky(scene, sky.uniforms, hemi, sun); // 秘密沙灘：星空
    applyEclipseSky(eclipse, scene, sky.uniforms, hemi, sun); // Eclipse：成個地圖變日蝕色
    applyMeteorSky(meteor, scene, sky.uniforms); // ☄️ METEORIC：天空帶藍紫色
    updateHud(dayNight, location);
    updateSideBoxes(dt);
  }
  // 電影入面（例如沙灘結局）：天空照樣跟沙灘變星空
  if (movie.active) {
    updateDayNight(dayNight, 0);
    applyBeachSky(scene, sky.uniforms, hemi, sun);
    applyEclipseSky(eclipse, scene, sky.uniforms, hemi, sun);
  }

  // Issue #4：Boss 戰 Phase 1、2 有球棒（一出現就揀咗佢）
  const batNow = whereIs(camera.position.x, camera.position.z) === 'Boss Arena' && hasBat(fight);
  if (batNow !== toolFlags.bat) {
    toolFlags.bat = batNow;
    selectSlot(0);
    if (batNow) popup('🏏 You got a BAT! Get close and press E or click to hit him!');
  }
  const sel = selectedHotbarItem();
  const vacuumOut = state.vacuumLevel > 0 && inHalloween(camera.position.x, camera.position.z) && !sel?.item.weapon; // 🧹 Halloween 世界：手拎吸塵機，唔拎寵物（🔫 拎住武器就唔拎）
  setHolding(rescue, sel?.kind === 'tool' || sel?.kind === 'gear' || vacuumOut || hwEggs?.isCarrying() ? null : sel?.item.name ?? null, sel?.item.mutation ?? null, !!sel?.item.flipped);
  // 鎚仔／球棒：第一身拎喺手，第三身拎喺右手
  const showTool = sel?.kind === 'tool' && !rescue.carrying && !sel.item.weapon; // 🔫 武器模型喺 weapons.js
  const bat = !!sel?.item.bat;
  handHammer.visible = showTool && !bat && thirdPerson.zoom === 0;
  avatarHammer.visible = showTool && !bat;
  handBat.visible = showTool && bat && thirdPerson.zoom === 0;
  holdShard(sel?.kind === 'gear' && !rescue.carrying && !vacuumOut && !hwEggs?.isCarrying() ? sel.item.gear : null); // 💎
  handShard.visible = !!heldShard && thirdPerson.zoom === 0;
  avatarShard.visible = !!heldShard;
  if (heldShard) for (const h of [handShard, avatarShard]) h.children[0]?.userData.animate?.(time);
  avatarBat.visible = showTool && bat;
  batSwing = Math.max(0, batSwing - dt);
  const k = batSwing > 0 ? Math.sin((1 - batSwing / 0.25) * Math.PI) : 0; // 揮棒
  handBat.rotation.set(-0.5 - k * 1.6, 0, 0.4 + k * 0.6);
  avatarBat.rotation.set(-0.35 - k * 2.2, 0, -0.25);
  if (!frozen) updateRescue(rescue, dt, time, player.walking);
  // 拎住寵物／抱住動物：第三身，寵物頂喺頭上
  const inMovie = intro.active || movie.active;
  if (inMovie) thirdPerson.avatar.g.visible = false;
  updateLabGuide(camera, time, state.labUnlocked && !state.labVisited && !inMovie);
  document.body.classList.toggle('in-movie', inMovie); // 播緊片：收埋稀有動物通知（唔好遮住畫面）
  document.body.classList.toggle('in-halloween', inHalloween(camera.position.x, camera.position.z)); // 🎃 Halloween 世界：收埋教學、正常世界嘅夜晚倒數
  document.body.classList.toggle('in-hell', inHell(camera.position.x, camera.position.z) || inReaperHall(camera.position.x, camera.position.z) || inTowerArena(camera.position.x, camera.position.z)); // 🔥 🗼 Hell：收埋火車、蛋提示（喺度用唔到）
  const viewCam = inMovie ? camera : updateThirdPerson(thirdPerson, dt, {
    held: rescue.carrying?.model || hwEggs?.carryModel() || rescue.holding?.model || null,
    item: rescue.carrying ? { name: rescue.carrying.animal.name, kg: rescue.carrying.kg, sizeMul: rescue.carrying.sizeMul } : selectedHotbarItem()?.item,
    walking: player.walking, feetY: player.feetY, grounded: player.grounded, vy: player.vy,
    station: trainingStationAt(hub, camera.position.x, camera.position.z),
    gymStation: gymStationAt(camera.position.x, camera.position.z), // 💪 Gym 動作（gymPoses.js）
    time, quality: quality.level, // 👕 皮膚粒子跟畫質
  });
  if (!inMovie) updateFishing(fishing, dt, time, { inside: halloween.inside, pos: camera.position, third: thirdPerson.zoom > 0, ui: fishUI, paused: isPaused() }); // 🎣 要喺 updateThirdPerson 之後（改手臂）
  // Issue #2：喺實驗室／Arena 入面，第三身鏡頭唔好退咗出牆外面（會成個畫面黑晒／望唔到）
  if (!inMovie && viewCam !== camera && !labStatus.gone && inLab(camera.position.x, camera.position.z)) {
    viewCam.position.z = THREE.MathUtils.clamp(viewCam.position.z, LAB.minZ + 1.3, LAB.maxZ - 1.3);
    viewCam.position.x = THREE.MathUtils.clamp(viewCam.position.x, LAB.minX + 1.3, LAB.maxX - 1.3);
  }
  // 💪 Gym 入面：第三身鏡頭唔好退咗出牆外面
  if (!inMovie && viewCam !== camera && inGym(camera.position.x, camera.position.z)) {
    viewCam.position.z = THREE.MathUtils.clamp(viewCam.position.z, GYM.minZ + 1.3, GYM.maxZ - 1.3);
    viewCam.position.x = THREE.MathUtils.clamp(viewCam.position.x, GYM.minX + 1.3, GYM.maxX - 1.3);
  }
  if (!inMovie && viewCam !== camera && Math.hypot(camera.position.x - ARENA.x, camera.position.z - ARENA.z) < ARENA.r) {
    const dx = viewCam.position.x - ARENA.x;
    const dz = viewCam.position.z - ARENA.z;
    const d = Math.hypot(dx, dz);
    const max = ARENA.r - 1.2;
    if (d > max) viewCam.position.set(ARENA.x + (dx / d) * max, viewCam.position.y, ARENA.z + (dz / d) * max);
  }
  avoidCameraClip(fight, viewCam.position);
  renderPass.camera = viewCam;
  for (const p of hub.plot.pets) p.group.visible = !petsHidden;
  const heldModel = rescue.holding?.model;
  if (heldModel) heldModel.visible = !petsHidden && !inMovie; // 播片時唔好喺鏡頭前面見到手上隻寵物
  stars.material.opacity = dayNight.blend * (0.85 + Math.sin(time * 2.1) * 0.15);
  stars2.material.opacity = dayNight.blend * (0.55 + Math.sin(time * 3.3 + 1.7) * 0.4); // 一閃一閃
  updateAmbience(ambience, frozen ? 0 : dt, time, camera.position, whereIs(camera.position.x, camera.position.z), dayNight.blend, dayNight.dusk, sky);
  // 🎃 Halloween 世界：恐怖天空、好近嘅霧、行雷（要喺 updateAmbience 之後，唔係霧會俾佢蓋返）
  applyHalloweenSky({ scene, skyUniforms: sky.uniforms, hemi, sun, dt, camPos: camera.position, playSound: play });
  // 🐉 Pumpkin Reaper Dragon + 🔫 武器（要喺 updateThirdPerson、applyHalloweenSky 之後）
  reaper.update(dt, time, { paused: isPaused(), frozen, inHw: inHalloween(camera.position.x, camera.position.z), view: viewCam });
  if (!isPaused() && !inMovie && !loading.active) reaper.autoEnter(camera.position);
  tower.update(dt, time, { paused: isPaused() || inMovie, frozen, view: viewCam }); // 🗼 Witch Tower（要喺 weapons.update 之前：打中先計到）
  // 🔫 武器淨係喺戰鬥區（塔、Reaper 大廳）先有：用任何方法離開（傳送、控制面板）都即刻收埋（小朋友 Issue #13）
  if (!inTowerArena(camera.position.x, camera.position.z)) weapons.setZone('tower', false);
  if (!inReaperHall(camera.position.x, camera.position.z)) weapons.setZone('reaper', false);
  weapons.update(dt, { view: viewCam, third: viewCam !== camera, time, paused: isPaused() || inMovie });
  hubPortal.update(time, isHalloweenOpen());
  hwWorld?.update(dt, time, camera.position, quality.level);
  hell?.update(dt, time, { pos: camera.position, player, paused: isPaused() || frozen || !!fling, quality: quality.level }); // 🔥 飛天熔岩石（載住你郁）、跌落熔岩
  expedition?.update(dt, time, camera.position); // 🗺️
  phantom.update(dt, time, camera.position); // 🚂
  ghostHunt.update(dt, time, { pos: camera.position, feetY: player.feetY, paused: isPaused(), view: viewCam, hideTool: !!weapons.held || reaper.inside || tower.inside }); // 🧹👻
  shards.update(time, camera.position); // 🗿
  if (!frozen) hwEggs?.update(dt, time, { x: camera.position.x, z: camera.position.z, feetY: player.feetY }); // 🥚
  echo?.update(dt, time, camera.position); // 🐕 Echo 搖尾（開箱動畫都要郁）
  echoQuests?.update(dt, time, camera.position); // 🐾 任務攤位 + HUD 追蹤器
  meteorShop.update(dt, time); // ☄️ 舖頭水晶閃、隕石火尾
  chests.update(dt, { pos: camera.position, yaw: camera.rotation.y, feetY: player.feetY, third: thirdPerson.zoom > 0, hidden: inMovie }); // 🧰 開箱動畫
  bossSkins.update(dt, time); // 🦹 隕石皮膚嘅細隕石轉圈
  demonicBossSkins.update(dt, time); // 😈 火球、翼
  if (halloween.sky > 0.01) {
    stars.material.opacity *= 1 - halloween.sky; // 普通星星喺好遠，Halloween 有自己嘅
    stars2.material.opacity *= 1 - halloween.sky;
  }

  // 太陽跟住玩家，影先會一直清楚
  sun.position.set(pos.x + 15, 30, pos.z + 8);
  sun.target.position.set(pos.x, 0, pos.z);

  const quake = inMovie ? null : meteorShake(meteor) || reaper.shake() || tower.shake(); // ☄️ 隕石撞落地／🐉 Boss 爆地板：震下畫面
  if (quake) viewCam.position.add(quake);
  if (quality.bloom) composer.render();
  else renderer.render(scene, viewCam);
  if (quake) viewCam.position.sub(quake);
  autoQuality(dt);
  if (!booted) {
    booted = true;
    requestAnimationFrame(() => finishBoot()); // 第一格（編譯 shader 最慢）畫完先淡出
  }
});

// 開發用：喺瀏覽器 console 打 game 可以睇／改嘢
// Issue #2 測試用：game.lab.grant(25)、game.lab.unlock()、game.lab.goto()
const labDebug = {
  god: false, // 測試用：唔會俾 Boss 打中
  // 俾你 n 隻 Legendary 寵物（試 Route B）
  legendary(n = 3) {
    for (const a of ANIMALS.slice(0, n)) state.pets.push({ name: a.name, biome: a.biome, kg: a.kg[0], rarity: 'Legendary', onPlot: false });
    return state.pets.length;
  },
  hammer() {
    state.hasHammer = true;
    lab.hammer.g.visible = false;
  },
  smashAll() {
    labDebug.hammer();
    for (const p of lab.pods) if (!p.free) smashPodNow(p);
  },
  unlock: () => startUnlockScene(), // 好似撳咗紅色掣
  arena() {
    // 直接入 Boss Arena（會開晒傳送門）
    labDebug.open();
    labDebug.smashAll();
    enterArena();
  },
  open() {
    openParkGate();
    state.labUnlocked = true;
  },
  goto(z = 95) {
    labDebug.open();
    teleportPlayer(player, 0, z);
    camera.rotation.set(0, Math.PI, 0, 'YXZ');
  },
  skipMovie: () => finishMovie(),
  fight, // 而家打到邊：game.lab.fight.phase
  start() {
    resetFight(fight);
    labDebug.arena();
  },
  attack: (what) => debugFight(fight, what), // 'drones' | 'animals' | 'portal' | 'tired' | 'hit'
  tired: () => debugFight(fight, 'tired'),
  hitCapsule: () => debugFight(fight, 'hit'),
  // 直接播結局：game.lab.ending()
  ending() {
    labDebug.open();
    Object.assign(state, { labBossDefeated: true, labEndingSeen: false, beachFinaleSeen: false });
    if (fight.phase !== 'defeated') {
      hideBoss(fight);
      fight.phase = 'gone';
    }
    startEnding();
  },
  resetFight: () => resetFight(fight),
  reset() {
    Object.assign(state, {
      labUnlocked: false, labVisited: false, labBossDefeated: false, labRewardPaid: false, labEndingSeen: false, beachFinaleSeen: false,
      hasHammer: false, labPodsSmashed: [], labLegendaryGiven: 0, labGivenSpecies: [],
    });
    parkGate.open = false;
    save();
  },
};

if (import.meta.env.DEV) window.game = { composer, reaper: reaper.debug, tower: tower.debug, weapons, inventory, chests, giveChests, admin: () => togglePanel('admin'), get echo() { return echo; }, candy: (n = 5000) => giveCandyCorn(n), crystals: (n = 5000) => giveCrystals(n), meteorShop, bossSkins, fishing, get hwEggs() { return hwEggs; }, phantom, ghostHunt, shards, forceTrain, useHalloweenShard, halloween, enterHalloween, leaveHalloween, get hwWorld() { return hwWorld; }, get hell() { return hell; }, get expedition() { return expedition; }, travelToHell, leaveHell, placePlayer, openHalloween: () => (state.halloweenEarly = true), playHatch: (name = 'Giant Panda', rarity = 'Legendary', i = 0) => { const m = hub.machines[i]; const back = { x: camera.position.x, z: camera.position.z }; player.controls.unlock(); playFirstHatch({ scene, camera, machine: m, pet: { name, rarity, kg: 100, biome: 0 }, from: back, onDone() { teleportPlayer(player, back.x, back.z); } }); }, renderer, ambience, gradePass, bloomPass, hemi, sun, crazy, crazyButton: () => ((crazy.debug = true), pressCrazy(crazy, rescue)), crazyPress: () => pressCrazy(crazy, rescue), gym, openGym: () => (gym.debug = true), eclipse, resetDevice: () => { state.device = null; save(); }, openKingdom: () => (kingdomDebug = true), fight, lab: labDebug, movie, handHammer, avatarHammer, thirdPerson, spawnAll, forceEvent, tutorial, quality, camera, player, dayNight, scene, rescue, hub, bosses, hazards, state, intro, isWalkable, platforms, colliders, spawn: (b, rarity) => spawnAnimal(rescue, b, null, null, rarity) };
if (import.meta.env.DEV) window.game.questline = Object.defineProperties(questline, { stall: { get: () => echoQuests }, open: { value: () => ((state.echoQuestsEarly = true), save()) } }); // 🐾 測試：game.questline.open()、.finish()、.jump(9)、.track('ghostCatch', 5)
if (import.meta.env.DEV) window.game.meteor = meteor; // ☄️ 測試：game.forceEvent('meteor')、game.meteor
