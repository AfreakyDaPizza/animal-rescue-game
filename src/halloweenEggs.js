// 🥚 Halloween 蛋 + NO MERCY Boss（小朋友 Issue #6，2026-10-19）
//
// 玩法：
//   1. 3 個 Halloween 生態區入面有蛋（越稀有越入）
//   2. 撳 E 攞蛋 → 霧好快收埋（睇唔到嘢）+ 一個發光紅色箭咀帶你返 Spawn Ruins（安全區）
//      → 呢個生態區嘅 Boss 追你；NO MERCY：你經過邊個生態區，嗰區嘅 Boss 都會醒、一齊追
//   3. 返到安全區 = 救咗隻蛋（state.hwEggs）；俾 Boss 捉到 = 蛋返原位、你飛返 Spawn Ruins
//   4. 蛋墳場（EGG_SLOTS 8 個位）撳 E 放蛋 → 倒數 → 撳 E 孵 → 寵物入背囊（state.pets）
//
// 俾其他系統用（例如 🎣 釣魚）：
//   import { addEgg } from './halloweenEggs.js';
//   addEgg('Voidseer Pumpkin', 'Eternal'); // 直接放一隻蛋入背囊（state.hwEggs），會自動存檔
//
// main.js 用法：
//   const hwEggs = createHalloweenEggs(scene, camera, { teleport, onCaught }) // 第一次入 Halloween 世界先起
//   hwEggs.update(dt, time, { x, z, feetY })                                  // 每格畫面
//   hwEggs.interaction(pos) → { prompt, action } | null                       // E 掣
//   hwEggs.carryModel() → 手上隻蛋嘅模型（第三身頂喺頭）| null
import * as THREE from 'three';
import { state, save } from './state.js';
import { HW_X, RUINS, RUINS_SAFE_R, HW_BIOMES, HW_NORTH_Z, EGG_SLOTS, HW_ARRIVE, inSafeZone, inHalloween, hwBiomeIndexAt } from './halloweenShape.js';
import { HALLOWEEN_BIOMES, rollHalloweenEgg } from './data/halloween.js';
import { findAnimal, randomKg } from './data/animals.js';
import { buildHalloweenEgg } from './halloweenPets.js';
import { HALLOWEEN_BOSS_BUILDERS } from './halloweenBosses.js';
import { buildAnimalModel } from './animalModels.js';
import {
  rarityInfo, INDEX_NEW_SPECIES_REWARD, HALLOWEEN_BOSS_SPEED, HALLOWEEN_BOSS_SIZE, HALLOWEEN_HEAD_START,
  HALLOWEEN_EGGS_PER_BIOME, HALLOWEEN_EGG_RESPAWN,
} from './data/balance.js';
import { walkSpeed } from './player.js';
import { animateRig } from './bosses.js';
import { makeLabel } from './signs.js';
import { halloween } from './halloweenWorld.js';
import { popup, announce } from './hud.js';
import { play } from './sound.js';
import { short } from './format.js';

const RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3, Mythic: 4, Eternal: 5 };
const SPECIAL = new Set(['Legendary', 'Mythic', 'Eternal']);
const CATCH = 1.6; // × Boss 大細
const EGG_SIZE = 1.2; // 地上隻蛋大概幾高（米）

// 🎣 其他系統（釣魚）用：直接放一隻蛋入背囊
export function addEgg(name, rarity) {
  const info = findAnimal(name);
  state.hwEggs = [...(state.hwEggs || []), { name, rarity: rarity || info?.rarity || 'Common' }];
  save();
  return state.hwEggs.length;
}

const hatchSecondsOf = (name) => findAnimal(name)?.hatchSeconds ?? 60;
const slotsList = () => {
  const s = Array.isArray(state.hwSlots) ? state.hwSlots.slice(0, EGG_SLOTS.length) : [];
  while (s.length < EGG_SLOTS.length) s.push(null);
  state.hwSlots = s;
  return s;
};
const fmtTime = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  return m ? `${m}:${String(sec % 60).padStart(2, '0')}` : `${sec}s`;
};

// 蛋模型縮到大概 EGG_SIZE 咁高、底貼地
function eggModel(name, rarity, size = EGG_SIZE) {
  const m = buildHalloweenEgg(name, rarity);
  const box = new THREE.Box3().setFromObject(m);
  const h = Math.max(0.01, box.max.y - box.min.y);
  m.scale.multiplyScalar(size / h);
  const g = new THREE.Group();
  m.position.y = -box.min.y * (size / h);
  g.add(m);
  g.userData.inner = m;
  return g;
}

export function createHalloweenEggs(scene, camera, { teleport, onCaught } = {}) {
  const root = new THREE.Group();
  scene.add(root);
  const hw = { wild: [], respawn: [HALLOWEEN_EGG_RESPAWN, HALLOWEEN_EGG_RESPAWN, HALLOWEEN_EGG_RESPAWN], carrying: null, bosses: [], slotModels: [], hatching: [], safeWas: true };

  // ---------- 🥚 野生蛋 ----------
  // fixed：俾 Boss 捉到之後，隻蛋返返原位（同一隻）
  function spawnEgg(bi, fixed = null) {
    const b = HW_BIOMES[bi];
    const info = fixed ? { name: fixed.name, rarity: fixed.rarity } : rollHalloweenEgg(HALLOWEEN_BIOMES[bi].key);
    const t = Math.min(0.95, 0.08 + RANK[info.rarity] * 0.18 + Math.random() * 0.12); // 越稀有越入（越北）
    const x = fixed ? fixed.x : THREE.MathUtils.lerp(b.eggZone.minX + 3, b.eggZone.maxX - 3, Math.random());
    const z = fixed ? fixed.z : THREE.MathUtils.lerp(b.eggZone.maxZ, b.eggZone.minZ, t);
    const g = eggModel(info.name, info.rarity);
    g.position.set(x, 0, z);
    root.add(g);
    // 腳下一圈稀有度顏色；Legendary 以上有光柱
    const color = new THREE.Color(rarityInfo(info.rarity).color);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);
    let beam = null;
    if (SPECIAL.has(info.rarity)) {
      beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
      beam.position.y = 30;
      g.add(beam);
    }
    const label = makeLabel([{ text: `🥚 ${info.name} Egg`, color: '#ffffff' }, { text: info.rarity, color: rarityInfo(info.rarity).color }], 0.75);
    label.position.y = EGG_SIZE + 0.9;
    g.add(label);
    hw.wild.push({ biome: bi, name: info.name, rarity: info.rarity, group: g, ring, beam, x, z, phase: Math.random() * 6 });
  }
  HW_BIOMES.forEach((_, bi) => {
    for (let i = 0; i < HALLOWEEN_EGGS_PER_BIOME; i++) spawnEgg(bi);
  });

  // ---------- 👹 Boss ----------
  HW_BIOMES.forEach((b, bi) => {
    const rig = HALLOWEEN_BOSS_BUILDERS[bi]();
    const group = new THREE.Group();
    group.add(rig.g);
    group.scale.setScalar(HALLOWEEN_BOSS_SIZE);
    const speed = HALLOWEEN_BOSS_SPEED[bi];
    const label = makeLabel([{ text: `BOSS: ${b.boss}`, color: '#ff5252' }, { text: `${short(speed)} Speed · NO MERCY`, color: '#ffeb3b' }], 1.1);
    label.position.y = bi === 1 ? 4.2 : 4.8;
    group.add(label);
    const home = new THREE.Vector3(b.bossHome.x, 0, b.bossHome.z);
    group.position.copy(home);
    root.add(group);
    hw.bosses.push({ index: bi, name: b.boss, rig, group, label, home, speed, mode: 'guard', grace: 0, runPhase: 0, special: 0, specialT: 2 + Math.random() * 2 });
  });

  // ---------- 🔴 發光紅色箭咀（地上，帶你返 Spawn Ruins）----------
  const arrow = new THREE.Group();
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.95, fog: false, depthWrite: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.35, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.6);
  shape.lineTo(1.1, -0.2);
  shape.lineTo(0.4, -0.2);
  shape.lineTo(0.4, 1.4);
  shape.lineTo(-0.4, 1.4);
  shape.lineTo(-0.4, -0.2);
  shape.lineTo(-1.1, -0.2);
  shape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(shape);
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
  arrowMesh.rotation.x = -Math.PI / 2; // 平放喺地上，尖頭指住 -z（之後轉）
  arrow.add(arrowMesh);
  const arrowGlow = new THREE.Mesh(arrowGeo, glowMat);
  arrowGlow.rotation.x = -Math.PI / 2;
  arrowGlow.scale.setScalar(1.35);
  arrowGlow.position.y = -0.01;
  arrow.add(arrowGlow);
  // 滴落嚟嘅紅色水點（唔係血，係發光嘅紅色魔法）
  const drips = Array.from({ length: 6 }, (_, i) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), arrowMat);
    d.userData = { x: (i - 2.5) * 0.3, t: Math.random() };
    arrow.add(d);
    return d;
  });
  arrow.visible = false;
  root.add(arrow);
  // HUD：畫面頂中間嘅大箭咀 + 距離
  const hud = document.createElement('div');
  hud.id = 'hw-arrow-hud';
  hud.innerHTML = '<span class="hw-arrow-icon">⬆</span><span class="hw-arrow-text"></span>';
  hud.hidden = true;
  document.body.appendChild(hud);
  const hint = document.createElement('div');
  hint.id = 'hw-egg-hint';
  hint.className = 'hud-box';
  hint.hidden = true;
  document.body.appendChild(hint);
  if (!document.getElementById('hw-egg-style')) {
    const st = document.createElement('style');
    st.id = 'hw-egg-style';
    st.textContent = `
      #hw-arrow-hud { position: fixed; top: calc(118px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 10px;
        padding: 8px 18px; border-radius: 999px; background: linear-gradient(#3a0008, #1a0003); border: 3px solid #ff1744; box-shadow: 0 0 24px rgba(255,23,68,.55), 0 4px 0 #000;
        font: 800 20px 'Fredoka', 'Baloo 2', system-ui, sans-serif; color: #ffebee; text-shadow: 0 2px 0 #000; pointer-events: none; animation: hwArrowPulse 0.9s ease-in-out infinite; }
      #hw-arrow-hud .hw-arrow-icon { display: inline-block; font-size: 30px; color: #ff1744; filter: drop-shadow(0 0 8px #ff1744); transition: transform .1s linear; }
      @keyframes hwArrowPulse { 50% { box-shadow: 0 0 40px rgba(255,23,68,.85), 0 4px 0 #000; } }
      #hw-egg-hint { position: fixed; top: calc(118px + env(safe-area-inset-top, 0px)); right: 12px; z-index: 30; padding: 8px 14px; font-weight: 700; max-width: 260px; }
      body.in-movie #hw-arrow-hud, body.in-movie #hw-egg-hint { visibility: hidden; }
      @media (prefers-reduced-motion: reduce) { #hw-arrow-hud { animation: none; } }`;
    document.head.appendChild(st);
  }

  // ---------- 🪦 蛋墳場：放咗嘅蛋 ----------
  function refreshSlots() {
    const slots = slotsList();
    slots.forEach((s, i) => {
      const cur = hw.slotModels[i];
      if (cur && (!s || cur.name !== s.name)) {
        root.remove(cur.group);
        hw.slotModels[i] = null;
      }
      if (s && !hw.slotModels[i]) {
        const g = eggModel(s.name, s.rarity, 1.1);
        g.position.set(EGG_SLOTS[i].x, 0.76, EGG_SLOTS[i].z);
        const label = makeLabel([{ text: `🥚 ${s.name}`, color: '#ffffff' }, { text: '...', color: '#ffd54f' }], 0.7);
        label.position.y = 2.1;
        g.add(label);
        root.add(g);
        hw.slotModels[i] = { name: s.name, group: g, label, last: '' };
      }
    });
  }
  refreshSlots();
  const slotLeft = (s) => s.start / 1000 + hatchSecondsOf(s.name) - Date.now() / 1000;

  // ---------- 💥 孵化效果：爆開 + 寵物彈出嚟 ----------
  function hatchEffect(i, name, rarity) {
    const at = new THREE.Vector3(EGG_SLOTS[i].x, 0.8, EGG_SLOTS[i].z);
    const color = new THREE.Color(rarityInfo(rarity).color);
    const fx = new THREE.Group();
    fx.position.copy(at);
    root.add(fx);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    fx.add(flash);
    const shardMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, transparent: true });
    const shards = Array.from({ length: 18 }, () => {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16), shardMat);
      m.position.set(0, 0.5, 0);
      fx.add(m);
      return { m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6), r: Math.random() * 8 };
    });
    let pet = null;
    try {
      pet = buildAnimalModel(findAnimal(name));
      const box = new THREE.Box3().setFromObject(pet);
      const s = 1.6 / Math.max(0.01, box.max.y - box.min.y);
      pet.scale.multiplyScalar(s);
      fx.add(pet);
    } catch (e) {
      pet = null;
    }
    hw.hatching.push({ fx, flash, shards, shardMat, pet, t: 0 });
  }

  // ---------- 撳 E ----------
  function grab(w) {
    root.remove(w.group);
    hw.wild = hw.wild.filter((x) => x !== w);
    const held = eggModel(w.name, w.rarity, 0.4);
    const wrap = new THREE.Group();
    wrap.position.set(0.5, -0.5, -0.95);
    wrap.add(held);
    wrap.userData.inner = held;
    wrap.userData.realMax = 1.4; // 第三身頂喺頭上面大概 1.4 米
    held.traverse((m) => (m.castShadow = false));
    camera.add(wrap);
    hw.carrying = { name: w.name, rarity: w.rarity, biome: w.biome, x: w.x, z: w.z, model: wrap };
    hw.safeWas = false;
    // 呢個生態區嘅 Boss：幾秒之後就追
    for (const b of hw.bosses) b.grace = b.index === w.biome ? HALLOWEEN_HEAD_START : 1;
    play('alarm');
    announce(`🥚 You grabbed the ${w.name} egg! The fog closes in... follow the RED ARROW to the Spawn Ruins! RUN!`);
    setTimeout(() => popup(`⚠️ ${HW_BIOMES[w.biome].boss} noticed! You have a ${HALLOWEEN_HEAD_START}-second head start!`), 900);
  }
  function dropCarried(back = true) {
    const c = hw.carrying;
    if (!c) return;
    c.model.removeFromParent();
    hw.carrying = null;
    if (back) spawnEgg(c.biome, c); // 蛋返原位
  }
  function placeEgg(i) {
    const eggs = state.hwEggs || [];
    if (!eggs.length) return;
    // 放最稀有嗰隻先（孵得最耐）
    let best = 0;
    eggs.forEach((e, k) => {
      if ((RANK[e.rarity] ?? 0) > (RANK[eggs[best].rarity] ?? 0)) best = k;
    });
    const egg = eggs[best];
    state.hwEggs = eggs.filter((_, k) => k !== best);
    const slots = slotsList();
    slots[i] = { name: egg.name, rarity: egg.rarity, start: Date.now() };
    save();
    refreshSlots();
    play('pop');
    popup(`🪦 ${egg.name} egg placed! It hatches in ${fmtTime(hatchSecondsOf(egg.name))}`);
  }
  function hatch(i) {
    const slots = slotsList();
    const s = slots[i];
    if (!s) return;
    const info = findAnimal(s.name);
    const pet = { name: s.name, biome: info?.biome ?? 7, kg: info ? randomKg(info) : 1, rarity: info?.rarity || s.rarity, onPlot: false };
    state.pets.push(pet);
    slots[i] = null;
    let reward = 0;
    if (!state.indexFound.includes(s.name)) {
      state.indexFound.push(s.name);
      reward = INDEX_NEW_SPECIES_REWARD[pet.biome] || 0;
      state.money += reward;
    }
    save();
    refreshSlots();
    hatchEffect(i, s.name, pet.rarity);
    play('crystal');
    setTimeout(() => play('rescue'), 350);
    announce(`🐣 Your ${pet.rarity} ${s.name} hatched! It's in your backpack. Put it on your Plot in the Hub!`);
    if (reward) setTimeout(() => popup(`📖 New Halloween pet in your Index! +$${short(reward)}`), 1200);
  }

  hw.interaction = (pos) => {
    if (!inHalloween(pos.x, pos.z)) return null;
    if (!hw.carrying) {
      const w = hw.wild.find((e) => Math.hypot(pos.x - e.x, pos.z - e.z) < 2.4);
      if (w) return { prompt: `<kbd>E</kbd> Grab the ${w.rarity} ${w.name} egg 🥚 (the boss will chase you!)`, action: () => grab(w) };
    }
    const slots = slotsList();
    for (let i = 0; i < EGG_SLOTS.length; i++) {
      if (Math.hypot(pos.x - EGG_SLOTS[i].x, pos.z - EGG_SLOTS[i].z) > 2.2) continue;
      const s = slots[i];
      if (!s) {
        const n = (state.hwEggs || []).length;
        if (hw.carrying) return { prompt: '🥚 Take your egg to the Spawn Ruins first to rescue it!' };
        if (!n) return { prompt: '🪦 Empty grave. Rescue Halloween eggs from the biomes to hatch them here!' };
        return { prompt: `<kbd>E</kbd> Place an egg here 🥚 (you have ${n})`, action: () => placeEgg(i) };
      }
      const left = slotLeft(s);
      if (left > 0) return { prompt: `🥚 ${s.name} hatches in ${fmtTime(left)}` };
      return { prompt: `<kbd>E</kbd> ✨ Hatch your ${s.name}!`, action: () => hatch(i) };
    }
    return null;
  };

  hw.carryModel = () => hw.carrying?.model || null;
  hw.isCarrying = () => !!hw.carrying;

  // ---------- 每格畫面 ----------
  hw.update = (dt, time, player) => {
    const here = inHalloween(player.x, player.z);
    // 野生蛋：轉吓、浮吓；拎走咗嘅一陣再出
    for (const w of hw.wild) {
      w.group.userData.inner.userData.animate?.(time + w.phase);
      w.group.userData.inner.rotation.y = time * 0.6 + w.phase;
      if (w.ring) w.ring.material.opacity = 0.55 + Math.sin(time * 3 + w.phase) * 0.3;
    }
    for (let bi = 0; bi < 3; bi++) {
      const count = hw.wild.filter((w) => w.biome === bi).length + (hw.carrying?.biome === bi ? 1 : 0);
      if (count >= HALLOWEEN_EGGS_PER_BIOME) hw.respawn[bi] = HALLOWEEN_EGG_RESPAWN;
      else if ((hw.respawn[bi] -= dt) <= 0) {
        spawnEgg(bi);
        hw.respawn[bi] = HALLOWEEN_EGG_RESPAWN;
      }
    }
    // 手上隻蛋搖吓
    if (hw.carrying) hw.carrying.model.userData.inner.userData.inner?.userData.animate?.(time);

    // 返到安全區 = 救咗
    if (hw.carrying && inSafeZone(player.x, player.z)) {
      const c = hw.carrying;
      c.model.removeFromParent();
      hw.carrying = null;
      state.hwEggs = [...(state.hwEggs || []), { name: c.name, rarity: c.rarity }];
      save();
      play('rescue');
      announce(`🥚 ${c.rarity} ${c.name} egg rescued! Take it to the 🪦 Egg Graveyard to hatch it.`);
    }
    if (hw.carrying && !here) dropCarried(true); // 離開咗 Halloween 世界（唔應該發生）

    // 霧收埋（halloweenWorld.js 讀 halloween.closeFog）
    const target = hw.carrying ? 1 : 0;
    halloween.closeFog = THREE.MathUtils.clamp((halloween.closeFog || 0) + (target - (halloween.closeFog || 0)) * Math.min(1, dt * (target ? 1.6 : 0.8)), 0, 1);

    // 紅色箭咀
    const toX = RUINS.x - player.x;
    const toZ = RUINS.z - player.z;
    const dist = Math.hypot(toX, toZ);
    arrow.visible = !!hw.carrying;
    hud.hidden = !hw.carrying;
    if (hw.carrying) {
      const ang = Math.atan2(toX, toZ); // 0 = 向 +z
      const ahead = Math.min(4.5, Math.max(1.5, dist - RUINS_SAFE_R));
      arrow.position.set(player.x + (toX / dist) * ahead, (player.feetY ?? 0) + 0.12 + Math.sin(time * 6) * 0.05, player.z + (toZ / dist) * ahead);
      arrow.rotation.y = ang + Math.PI; // 個形尖頭向 -y（平放後 = +z），轉向目標
      arrowMat.opacity = 0.75 + Math.sin(time * 8) * 0.2;
      drips.forEach((d) => {
        d.userData.t = (d.userData.t + dt * 1.2) % 1;
        d.position.set(d.userData.x, 0.5 - d.userData.t * 0.5, 0.6);
        d.scale.setScalar(1 - d.userData.t * 0.6);
      });
      // HUD 箭咀：跟鏡頭方向計
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const camAng = Math.atan2(fwd.x, fwd.z);
      const rel = THREE.MathUtils.radToDeg(camAng - ang);
      hud.querySelector('.hw-arrow-icon').style.transform = `rotate(${rel}deg)`;
      hud.querySelector('.hw-arrow-text').textContent = `RUN to the Spawn Ruins! ${Math.max(0, Math.round(dist - RUINS_SAFE_R))} m`;
    }

    // 蛋墳場：倒數牌
    const slots = slotsList();
    hw.slotModels.forEach((m, i) => {
      if (!m || !slots[i]) return;
      m.group.userData.inner.userData.animate?.(time + i);
      const left = slotLeft(slots[i]);
      const text = left > 0 ? `⏳ ${fmtTime(left)}` : '✨ Ready to hatch!';
      if (text !== m.last) {
        m.last = text;
        m.label.userData.setLines([{ text: `🥚 ${slots[i].name}`, color: '#ffffff' }, { text, color: left > 0 ? '#ffd54f' : '#69f0ae' }]);
      }
      if (left <= 0) m.group.userData.inner.rotation.z = Math.sin(time * 18) * 0.12; // 震吓震吓：就快爆
    });
    // 孵化效果
    for (const h of hw.hatching) {
      h.t += dt;
      h.flash.scale.setScalar(0.5 + h.t * 6);
      h.flash.material.opacity = Math.max(0, 1 - h.t * 2.5);
      for (const s of h.shards) {
        s.v.y -= 14 * dt;
        s.m.position.addScaledVector(s.v, dt);
        s.m.rotation.x += s.r * dt;
        if (s.m.position.y < -0.7) s.m.position.y = -0.7;
      }
      h.shardMat.opacity = Math.max(0, 1 - (h.t - 0.8));
      if (h.pet) {
        h.pet.position.y = Math.max(0, Math.sin(Math.min(h.t, 2.4) * 4) * 1.2) + (h.t < 0.4 ? h.t : 0.4);
        h.pet.rotation.y = h.t * 3;
        h.pet.userData.animate?.(time, 1);
      }
    }
    hw.hatching = hw.hatching.filter((h) => {
      if (h.t < 2.6) return true;
      root.remove(h.fx);
      return false;
    });

    // ---------- 👹 Boss：NO MERCY ----------
    let caught = null;
    const pb = hwBiomeIndexAt(player.x, player.z);
    const safe = inSafeZone(player.x, player.z);
    for (const b of hw.bosses) {
      const pos = b.group.position;
      b.grace = Math.max(0, b.grace - dt);
      const d = Math.hypot(player.x - pos.x, player.z - pos.z);
      if (hw.carrying && !safe && b.grace <= 0 && (pb === b.index || b.mode === 'chase')) {
        if (b.mode !== 'chase') {
          b.mode = 'chase';
          if (b.index !== hw.carrying.biome) popup(`👹 NO MERCY! The ${b.name} woke up and is chasing you too!`);
          play('roar');
        }
      } else if (b.mode === 'chase') b.mode = 'return';
      let target = null;
      let speed = walkSpeed(b.speed);
      if (b.mode === 'chase') target = player;
      else if (b.mode === 'return') {
        target = b.home;
        speed = Math.min(speed, 18);
      }
      let moving = 0;
      // 特別招式
      b.specialT -= dt;
      if (b.mode === 'chase' && b.specialT <= 0) {
        b.special = 1;
        b.specialT = b.index === 0 ? 3 : b.index === 1 ? 4 : 3.5;
      }
      b.special = Math.max(0, b.special - dt * 1.2);
      const ud = b.rig.g.userData;
      if (b.index === 0) ud.pound?.(d < 14 ? Math.sin(Math.min(1, 1 - b.special) * Math.PI) : 0); // Pumpkin Tyrant：近就搥地
      if (b.index === 1) ud.flicker?.(b.special > 0.6 ? (1 - b.special) / 0.4 : b.special / 0.6); // Hollow Wraith：閃一閃
      if (b.index === 2) ud.fly?.(b.mode === 'chase' ? 0.4 + b.special * 0.6 : 0); // Bone Drake：飛
      if (b.index === 1 && b.mode === 'chase' && b.special > 0.95 && d > 14) {
        // Hollow Wraith 瞬間移動：向你跳近 8 米
        const k = Math.min(8, d - 10) / d; // 唔會一跳就跳到你面前（最近 10 米）
        pos.x += (player.x - pos.x) * k;
        pos.z += (player.z - pos.z) * k;
        b.special = 0.94;
        play('poof');
      }
      if (b.index === 2 && b.special > 0.3) speed *= 1.35; // Bone Drake 飛撲
      if (target) {
        const dx = target.x - pos.x;
        const dz = target.z - pos.z;
        const dd = Math.hypot(dx, dz);
        if (dd > 0.05) {
          const step = Math.min(dd, speed * dt);
          pos.x += (dx / dd) * step;
          pos.z += (dz / dd) * step;
          b.group.rotation.y = Math.atan2(-dx, -dz);
          moving = b.mode === 'chase' ? 1 : 0.6;
        }
        if (b.mode === 'return' && dd < 0.4) b.mode = 'guard';
      } else if (pb === b.index) b.group.rotation.y = Math.atan2(-(player.x - pos.x), -(player.z - pos.z));
      // 唔准入安全區、唔准出 3 個生態區嗰條直路
      const fromRuins = Math.hypot(pos.x - RUINS.x, pos.z - RUINS.z);
      const keep = RUINS_SAFE_R + 4;
      if (fromRuins < keep) {
        pos.x = RUINS.x + ((pos.x - RUINS.x) / fromRuins) * keep;
        pos.z = RUINS.z + ((pos.z - RUINS.z) / fromRuins) * keep;
      }
      pos.x = THREE.MathUtils.clamp(pos.x, HW_X - 40, HW_X + 40);
      pos.z = THREE.MathUtils.clamp(pos.z, HW_NORTH_Z + 2, -10);
      pos.y = 0;
      animateRig(b, dt, time, moving);
      b.label.visible = here;
      if (b.mode === 'chase' && !caught && d < CATCH * HALLOWEEN_BOSS_SIZE && (player.feetY ?? 0) < 1.5 * HALLOWEEN_BOSS_SIZE) caught = b;
    }
    if (caught) {
      dropCarried(true);
      for (const b of hw.bosses) {
        b.mode = 'return';
        b.grace = 3;
      }
      halloween.closeFog = 0.6;
      play('slam');
      teleport?.(HW_ARRIVE.x, HW_ARRIVE.z);
      announce(`💥 The ${caught.name} caught you! The egg went back... Train more ⚡ Speed and try again!`);
      onCaught?.(caught);
    }

    // HUD 提示
    hint.hidden = !here || !!hw.carrying;
    if (!hint.hidden) {
      const n = (state.hwEggs || []).length;
      const ready = slotsList().filter((s) => s && slotLeft(s) <= 0).length;
      const t = `🥚 Eggs: ${n} · Take eggs to the 🪦 Egg Graveyard to hatch${ready ? ` · ✨ ${ready} ready!` : ''}`;
      if (hint.textContent !== t) hint.textContent = t;
    }
    return { caught };
  };

  hw.setVisible = (v) => {
    root.visible = v;
  };
  return hw;
}
