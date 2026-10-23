// 🧰 寶箱系統（小朋友 2026-10-22）
// 「bulk buy chests → 入 inventory → 放上 hotbar → spam click 開 → 個箱由你身上飛出嚟、轉、見到寵物；
//   開好多個就圍住你轉圈；開到稀有嘢個箱會飛上天、發光、爆開」
//
// - 寶箱係 Gear（data/gears.js：zombieChest、meteorChest，chest: true），買咗入 state.gears
// - 快捷欄揀咗個箱：撳滑鼠／E（手機撳 USE）= 開一個。撳得快就排隊（queue），一個接一個好快咁開，唔會停你行路
// - 動畫喺世界入面、圍住玩家（唔係全畫面電影），第一身／第三身都睇到
//   普通：箱彈出嚟 → 喺你前面轉 → 開蓋 + 爆光 → 寵物升出嚟 + 名牌（大約 1.5 秒）
//   開好多個：舊嘅飛去你身邊圍住你轉圈（最多 10 個，最舊嗰個先走）
//   稀有（Legendary／Mythic／Eternal／Astral Reroll）：箱飛上天 → 用稀有度顏色發光（Bloom）→ 震 → 爆炸 → 寵物跌落嚟；Mythic 以上有大字
// - 撳嗰下即刻用咗個箱 + 抽好；開蓋嗰下先俾獎（寵物入背包／Candy Corn／Astral Reroll／新品種 Index 獎金），閂網頁會即刻俾晒
//
// main.js 用法：
//   const chests = createChests(scene)
//   chests.open('zombieChest')                         // 開一個（冇箱就彈提示）
//   chests.update(dt, { pos: camera.position, yaw: camera.rotation.y, feetY, third, hidden })  // third = 第三身（擺右手邊、飛高啲，唔俾公仔遮住）
//   giveChests('meteorChest', 10)                      // 控制面板／任務送箱（或者直接 addGear + save）

import * as THREE from 'three';
import { state, save } from './state.js';
import { INDEX_NEW_SPECIES_REWARD, ZOMBIE_CHEST_DROPS, ZOMBIE_CHEST_CANDY, rarityInfo } from './data/balance.js';
import { rollZombieChest } from './data/echoChest.js';
import { rollMeteorChest, METEOR_CHEST_DROPS } from './data/meteorShop.js';
import { findAnimal, randomKg } from './data/animals.js';
import { addGear, takeGear, gearCount, gearInfo } from './data/gears.js';
import { buildAnimalModel } from './animalModels.js';
import { buildZombieChest } from './echoShop.js';
import { buildMeteorChest } from './meteorShop.js';
import { buildDemonicChest } from './demonicPetModels.js'; // 😈 Witch Tower（Issue #11）
import { rollDemonicChest, DEMONIC_CHEST_DROPS } from './data/demonic.js';
import { makeLabel } from './signs.js';
import { candyCorn } from './echoPetModels.js';
import { play } from './sound.js';
import { short } from './format.js';
import { popup, announce, renderHotbar } from './hud.js';

const PI = Math.PI;
const CANDY = '🌽';
const RARE = new Set(['Legendary', 'Mythic', 'Eternal']);
const BIG = new Set(['Mythic', 'Eternal']); // 有大字（announce）

// 🎮 數字（可以自己改）
const MAX_ORBIT = 10; // 圍住你轉嘅最多幾個
const QUEUE_MAX = 15; // 排隊最多幾個（撳太多：之後嘅唔算，個箱唔會俾你用咗）
const FRONT_DIST = 3.2; // 喺你前面幾遠開（第一身；太近會遮晒個畫面、名牌會俾上面啲字遮住）
const ORBIT_R = 2.4; // 轉圈有幾闊
const HOLD = 1.6; // 冇開新箱：寵物喺前面展示幾耐（秒）
const HOLD_RARE = 2.6;
const ORBIT_STAY = 3.0; // 停咗開箱：圍住你轉嘅嘢再轉幾耐先飛返入背包

// 每種箱：模型、點抽、講法
export const CHEST_TYPES = {
  zombieChest: {
    name: 'Zombified Chest', build: buildZombieChest, glow: 0x76ff03, label: '🧟',
    roll: (forced) => {
      const d = forced ? { ...ZOMBIE_CHEST_DROPS.find((x) => x.name === forced) } : rollZombieChest();
      if (d.name === 'Candy Corn' && !d.candy) d.candy = Math.round((ZOMBIE_CHEST_CANDY[0] + ZOMBIE_CHEST_CANDY[1]) / 2);
      return d;
    },
  },
  meteorChest: {
    name: 'Meteoric Chest', build: buildMeteorChest, glow: 0x40c4ff, label: '☄️', debris: 0x1a2a6c, where: 'the ☄️ Meteoric Shop',
    roll: (forced) => (forced ? { ...METEOR_CHEST_DROPS.find((x) => x.name === forced) } : rollMeteorChest()),
  },
  // 😈 Demonic Chest（小朋友 Issue #11）：Witch Tower 獎品；機會率 balance.js DEMONIC_CHEST_DROPS（加埋 105 → 按比例計）
  demonicChest: {
    name: 'Demonic Chest', build: buildDemonicChest, glow: 0xff3d00, label: '😈', debris: 0x1a0f12, where: 'the 🧙 Witch Tower',
    roll: (forced) => (forced ? { ...DEMONIC_CHEST_DROPS.find((x) => x.name === forced) } : rollDemonicChest()),
  },
};

// 抽一次（純粹計，唔改存檔）
export const rollChest = (type, forced = null) => CHEST_TYPES[type].roll(forced);

// 俾獎（改 state，未存檔）：回傳 { reward: 新品種 Index 獎金, pet }
export function giveChestReward(drop) {
  if (drop.candy) {
    state.candyCorn = (state.candyCorn || 0) + drop.candy;
    return { reward: 0, pet: null };
  }
  if (drop.gear) {
    addGear(drop.gear);
    return { reward: 0, pet: null };
  }
  const info = findAnimal(drop.name);
  const biome = info?.biome ?? 9;
  const pet = { name: drop.name, biome, kg: info ? randomKg(info) : 1, rarity: drop.rarity, onPlot: false };
  state.pets.push(pet);
  let reward = 0;
  if (!state.indexFound.includes(drop.name)) {
    state.indexFound.push(drop.name);
    reward = INDEX_NEW_SPECIES_REWARD[biome] || 0;
    state.money += reward;
  }
  return { reward, pet };
}

// 送箱（控制面板／任務用）：入背包 + 存檔 + 快捷欄數字更新
export function giveChests(type, n = 1, { quiet = false } = {}) {
  if (!CHEST_TYPES[type] || n <= 0) return 0;
  addGear(type, n);
  save();
  renderHotbar();
  if (!quiet) popup(`+${n} ${gearInfo(type).name}${n === 1 ? '' : 's'} added to your 🎒`);
  return gearCount(type);
}

const isRare = (drop) => !!drop.gear || RARE.has(drop.rarity);
const colorOf = (drop) => (drop.candy ? '#ffb300' : drop.gear ? gearInfo(drop.gear).color : rarityInfo(drop.rarity).color === '#cfd8dc' ? '#eceff1' : rarityInfo(drop.rarity).color);

// ======================== 開出嚟嘅嘢（模型） ========================
function buildPrize(drop, h) {
  const g = new THREE.Group();
  if (drop.candy) {
    // 一堆 Candy Corn
    const s = h * 0.32;
    candyCorn(g, s, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const c = candyCorn(g, s * 0.6, Math.cos(a) * s * 0.9, 0, Math.sin(a) * s * 0.9);
      c.rotation.z = Math.cos(a) * 0.5;
      c.rotation.x = Math.sin(a) * 0.5;
    }
    return { g, animate: null, own: [] };
  }
  if (drop.gear) {
    // 🌌 Astral Reroll：發光水晶 + 光環
    const c = new THREE.Color(gearInfo(drop.gear).color);
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, roughness: 0.15 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(h * 0.32, 0), mat);
    gem.scale.y = 1.5;
    gem.position.y = h * 0.5;
    g.add(gem);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.45, h * 0.025, 8, 40), ringMat);
    ring.position.y = h * 0.5;
    g.add(ring);
    return { g, animate: (t) => { gem.rotation.y = t * 2; ring.rotation.set(PI / 2 + Math.sin(t * 1.5) * 0.5, t, 0); }, own: [gem, ring] };
  }
  try {
    const m = buildAnimalModel(findAnimal(drop.name));
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    m.scale.multiplyScalar(h / Math.max(0.01, size.y, size.x * 0.75, size.z * 0.75));
    g.add(m);
    return { g, animate: (t) => m.userData.animate?.(t, 0), own: [] };
  } catch (e) {
    console.warn('chest prize model failed', e);
    return { g, animate: null, own: [] };
  }
}

// ======================== 主程式 ========================
export function createChests(scene) {
  ensureCss();
  const world = new THREE.Group(); // 全部寶箱動畫放喺度
  world.name = 'chests';
  scene.add(world);
  // 一盞共用嘅燈（加減燈會令全部 shader 重新編譯 → 卡一卡，所以一開始就放定，平時 0 光）
  const light = new THREE.PointLight(0xffffff, 0, 9, 1.6);
  world.add(light);
  let lightK = 0;

  const queue = []; // 等緊開嘅：{ type, drop, reward }
  const items = []; // 開緊／展示緊／轉緊圈嘅
  let clock = 0;
  let lastStart = -9;
  let lastActivity = -9;
  let spin = 0; // 轉圈角度
  let order = 0;
  const api = { items, queue };

  // ---------- 粒子（共用形狀；每種顏色一個 material，用縮細嚟淡出） ----------
  const partGeo = new THREE.OctahedronGeometry(0.06);
  const partMats = new Map();
  const partMat = (hex) => {
    if (!partMats.has(hex)) partMats.set(hex, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    return partMats.get(hex);
  };
  const parts = [];
  function burst(at, n, speed, colors, up = 2.5, size = 1) {
    for (let i = 0; i < n && parts.length < 400; i++) {
      const m = new THREE.Mesh(partGeo, partMat(colors[i % colors.length]));
      m.position.copy(at);
      world.add(m);
      const a = Math.random() * PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.8);
      const s = size * (0.7 + Math.random() * 0.8);
      parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, up * (0.3 + Math.random()), Math.sin(a) * sp), life: 0.7 + Math.random() * 0.6, t: 0, s, spin: Math.random() * 12 });
    }
  }
  // 爆炸閃光波波（稀有）／開蓋小閃光
  const flashGeo = new THREE.SphereGeometry(1, 18, 12);
  const flashes = [];
  function flashBall(at, color, size, life = 0.5) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(flashGeo, mat);
    m.position.copy(at);
    world.add(m);
    flashes.push({ m, size, life, t: 0 });
  }
  function screenFlash(color) {
    const f = document.getElementById('chest-flash');
    f.style.setProperty('--c', color);
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  }

  // ---------- 開一個 ----------
  // forced = 測試用：指定開到乜（唔使用箱，例如 open('meteorChest', 'Meteor Dragon')）
  api.open = (type, forced = null) => {
    if (!CHEST_TYPES[type]) return false;
    if (queue.length >= QUEUE_MAX) return false; // 撳太快：呢下唔算（箱仲喺度）
    if (!forced) {
      if (gearCount(type) <= 0) {
        popup(`🧰 No ${gearInfo(type).name}s left! Get more at ${CHEST_TYPES[type].where || '🧟🐕 Zonko'}.`);
        return false;
      }
      takeGear(type);
    }
    const drop = rollChest(type, forced);
    save();
    renderHotbar();
    queue.push({ type, drop });
    return true;
  };
  // 獎喺開蓋嗰下先俾（唔好喺快捷欄／背包度預先見到開咗乜）；
  // 未開完就閂網頁：即刻俾晒，唔會唔見嘢
  function flush() {
    let any = false;
    for (const it of [...queue, ...items]) {
      if (it.given) continue;
      it.given = true;
      giveChestReward(it.drop);
      any = true;
    }
    if (any) save();
  }
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  api.count = (type) => gearCount(type);
  api.active = () => items.length + queue.length > 0;

  const rareBlocking = () => items.some((it) => it.rare && !it.leaving && it.t < it.T_OPEN + 0.7);

  function start(entry, ctx) {
    const { type, drop } = entry;
    if (entry.given) return null;
    const def = CHEST_TYPES[type];
    const rare = isRare(drop);
    const big = !!drop.gear || BIG.has(drop.rarity);
    const color = new THREE.Color(colorOf(drop));
    const root = new THREE.Group();
    world.add(root);
    const chest = def.build();
    chest.g.scale.setScalar(rare ? 0.62 : 0.52);
    chest.g.position.y = -0.3;
    root.add(chest.g);
    // 稀有：一層發光殼（Bloom 會令佢好光）
    let aura = null;
    if (rare) {
      aura = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      aura.position.y = -0.05;
      root.add(aura);
    }
    const prizeH = rare ? (big ? 0.95 : 0.85) : 0.6;
    const prize = buildPrize(drop, prizeH);
    prize.g.visible = false;
    prize.g.position.y = 0.05;
    root.add(prize.g);
    // 由你身上（心口）彈出嚟
    const f = new THREE.Vector3(-Math.sin(ctx.yaw), 0, -Math.cos(ctx.yaw));
    root.position.set(ctx.pos.x + f.x * 0.25, ctx.feetY + 1.0, ctx.pos.z + f.z * 0.25);
    root.scale.setScalar(0.15);
    const it = {
      id: order++, type, drop, reward: 0, given: false, rare, big, color, root, chest, aura, prize, prizeH, label: null,
      t: 0, T_POP: 0.3, T_OPEN: rare ? 2.3 : 0.8, opened: false, orbit: false, leaving: false, leaveT: 0,
      holdUntil: Infinity, scale: 0.15, yaw: ctx.yaw + PI,
    };
    // 唔使影（好多個一齊開都唔會慢）
    root.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    // 前面嗰個（未變圈）推落去轉圈
    for (const o of items) if (!o.orbit && !o.leaving && !(o.rare && o.t < o.T_OPEN + 0.7)) o.orbit = true;
    items.push(it);
    lastStart = clock;
    lastActivity = clock;
    play(rare ? 'swoosh' : 'pop');
    if (rare) setTimeout(() => play('drumroll'), 400);
    return it;
  }

  // 開蓋／爆炸嗰一下
  function reveal(it) {
    it.opened = true;
    // 俾獎（寵物入背包／Candy Corn／Astral Reroll／新品種 Index 獎金）
    if (!it.given) {
      it.given = true;
      it.reward = giveChestReward(it.drop).reward;
      save();
      renderHotbar();
    }
    const drop = it.drop;
    const info = findAnimal(drop.name);
    const nameText = drop.candy ? `+${short(drop.candy)} ${CANDY} Candy Corn` : drop.gear ? `${gearInfo(drop.gear).emoji} ${gearInfo(drop.gear).name}` : `${info?.emoji || ''} ${drop.name}`;
    const rarityText = drop.candy ? 'CANDY CORN' : drop.gear ? '✨ SUPER RARE ✨' : it.big ? `✨ ${drop.rarity.toUpperCase()} ✨` : drop.rarity.toUpperCase();
    const label = makeLabel([{ text: rarityText, color: colorOf(drop) }, { text: nameText }, ...(it.reward ? [{ text: `📖 NEW! +$${short(it.reward)}`, color: '#ffd740' }] : [])], it.rare ? 0.55 : 0.45);
    label.center.set(0.5, 0); // 由下面計：幾多行都企喺寵物頭上
    label.position.y = 0.05 + it.prizeH + 0.08;
    it.root.add(label);
    it.label = label;
    const at = it.root.getWorldPosition(new THREE.Vector3());
    const hex = it.color.getHex();
    const glowHex = CHEST_TYPES[it.type].glow;
    if (it.rare) {
      // 💥 爆炸！
      it.chest.g.visible = false;
      if (it.aura) it.aura.visible = false;
      flashBall(at, hex, it.big ? 1.9 : 1.5, 0.7);
      flashBall(at, 0xffffff, 0.9, 0.35);
      const rainbow = [0xff4081, 0xffd740, 0x69f0ae, 0x40c4ff, 0xb388ff];
      burst(at, it.big ? 90 : 60, it.big ? 6 : 4.5, it.big ? [hex, 0xffffff, ...rainbow] : [hex, 0xffffff, glowHex], 4, 1.6);
      burst(at, 14, 3, [CHEST_TYPES[it.type].debris ?? 0x51703f], 3, 2.4); // 箱碎
      if (it.type === 'demonicChest') {
        // 😈 火爆：多一圈火星 + 橙色火球
        burst(at, it.big ? 70 : 45, it.big ? 7 : 5.5, [0xff3d00, 0xff6d00, 0xffab00, 0xffd740], 5, 1.5);
        flashBall(at, 0xff3d00, it.big ? 2.4 : 1.9, 0.9);
      }
      screenFlash(colorOf(it.drop));
      lightK = 1;
      light.color.copy(it.color).lerp(new THREE.Color(0xffffff), 0.3);
      play('boom');
      setTimeout(() => play('magic'), 220);
      if (it.big) setTimeout(() => play('rescue'), 650);
      const what = it.drop.gear ? `an ${gearInfo(it.drop.gear).name.toUpperCase()}` : `a ${it.drop.rarity.toUpperCase()} ${it.drop.name}`;
      if (it.big) announce(`${CHEST_TYPES[it.type].label} WOW! You opened ${what}!${it.drop.gear ? ' Use it on a pet in your 🎒' : ''}`);
      else popup(`✨ ${it.drop.rarity} ${it.drop.name}!`);
    } else {
      flashBall(at.clone().add(new THREE.Vector3(0, 0.1, 0)), hex, 0.7, 0.35);
      burst(at, 18, 2.2, [hex, glowHex, 0xffffff], 2.5);
      if (lightK < 0.5) {
        lightK = 0.5;
        light.color.copy(it.color);
      }
      play(it.drop.candy ? 'candy' : 'crystal');
      if (it.drop.candy) popup(`+${short(it.drop.candy)} ${CANDY} Candy Corn`);
    }
    if (it.reward) setTimeout(() => popup(`📖 NEW in your Index: ${it.drop.name}! +$${short(it.reward)}`), it.rare ? 900 : 300);
    it.prize.g.visible = true;
    it.revealT = it.t;
    it.holdUntil = it.t + (it.rare ? HOLD_RARE : HOLD);
  }

  function dispose(it) {
    world.remove(it.root);
    it.label?.material.map.dispose();
    it.label?.material.dispose();
    it.chest.innerGlow?.geometry.dispose();
    it.chest.innerGlow?.material.dispose();
    it.chest.glowMat?.dispose();
    it.aura?.material.dispose();
    for (const o of it.prize.own) {
      o.geometry.dispose();
      o.material.dispose();
    }
  }

  const tmp = new THREE.Vector3();
  const target = new THREE.Vector3();
  api.update = (dt, ctx) => {
    clock += dt;
    world.visible = !ctx.hidden;
    // 排隊：一個接一個開（排得多就開快啲）；稀有嗰個爆完先開下一個
    if (queue.length && !rareBlocking() && clock - lastStart >= (queue.length > 4 ? 0.12 : 0.2)) start(queue.shift(), ctx);
    if (!items.length && !parts.length && !flashes.length) {
      light.intensity = 0;
      return;
    }
    const P = ctx.pos;
    const fx = -Math.sin(ctx.yaw);
    const fz = -Math.cos(ctx.yaw);
    spin += dt * 0.9;
    // 轉圈嘅嘢：太多就最舊嗰個先走；停咗開箱一陣就全部飛返入背包
    const ring = items.filter((o) => o.orbit && !o.leaving);
    for (let i = 0; i < ring.length - MAX_ORBIT; i++) ring[i].leaving = true;
    if (!queue.length && clock - lastActivity > ORBIT_STAY) {
      ring.forEach((o, i) => {
        if (o.opened && clock - lastActivity > ORBIT_STAY + i * 0.12) o.leaving = true;
      });
    }
    const orbiting = items.filter((o) => o.orbit && !o.leaving);
    for (let n = items.length - 1; n >= 0; n--) {
      const it = items[n];
      it.t += dt;
      const t = it.t;
      // 展示完：有其他嘢喺度轉 → 加入轉圈；冇 → 飛返入背包
      if (!it.orbit && !it.leaving && t > it.holdUntil) {
        if (orbiting.length || queue.length) it.orbit = true;
        else it.leaving = true;
      }
      if (it.leaving) it.leaveT += dt;
      if (it.leaveT > 0.45) {
        dispose(it);
        items.splice(n, 1);
        continue;
      }
      // ---- 去邊 ----
      if (it.leaving) {
        target.set(P.x, ctx.feetY + 1.0, P.z);
      } else if (it.orbit) {
        const idx = Math.max(0, orbiting.indexOf(it));
        const a = spin + (idx / Math.max(1, orbiting.length)) * PI * 2;
        target.set(P.x + Math.cos(a) * ORBIT_R, ctx.feetY + 1.15 + Math.sin(clock * 2 + idx) * 0.12, P.z + Math.sin(a) * ORBIT_R);
      } else {
        // 第一身：正前面；第三身：前面偏右（唔俾自己個公仔遮住）
        const dist = ctx.third ? 0.9 : FRONT_DIST; // 第三身：喺公仔隔籬（同公仔差唔多遠），鏡頭影得清楚
        const side = ctx.third ? 1.4 : 0;
        target.set(P.x + fx * dist - fz * side, ctx.feetY + (ctx.third ? 1.35 : 1.15), P.z + fz * dist + fx * side);
        // 稀有：未爆之前飛上天（第一身飛少啲，唔係飛出畫面）
        if (it.rare) {
          const rise = THREE.MathUtils.smoothstep(t, it.T_POP, 1.0) * (1 - THREE.MathUtils.smoothstep(t, it.T_OPEN + 0.1, it.T_OPEN + 0.8));
          target.y += rise * (ctx.third ? 1.3 : 0.55);
        }
      }
      const k = t < it.T_POP ? Math.min(1, dt * 16) : it.leaving ? Math.min(1, dt * 10) : 1 - Math.exp(-dt * 7);
      it.root.position.lerp(target, k);
      if (t < it.T_POP) it.root.position.y += Math.sin((t / it.T_POP) * PI) * 0.06; // 彈一彈
      // ---- 大細 ----
      const want = (it.leaving ? 0.01 : it.orbit ? 0.62 : 1) * (ctx.third ? 1.45 : 1); // 第三身：鏡頭遠啲，放大少少
      it.scale += (want - it.scale) * Math.min(1, dt * (t < it.T_POP ? 14 : 8));
      it.root.scale.setScalar(Math.max(0.01, it.scale));
      // ---- 面向你 ----
      tmp.set(P.x - it.root.position.x, 0, P.z - it.root.position.z);
      const face = Math.atan2(-tmp.x, -tmp.z);
      let d = face - it.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      it.yaw += d * Math.min(1, dt * 8);
      it.root.rotation.y = it.yaw;
      // ---- 箱：轉、震、發光 ----
      if (!it.opened) {
        const c = it.chest;
        const k2 = THREE.MathUtils.clamp((t - it.T_POP) / (it.T_OPEN - it.T_POP), 0, 1);
        if (it.rare) {
          // 轉 → 震（越嚟越勁）
          const spinK = THREE.MathUtils.clamp(t / 1.2, 0, 1);
          c.g.rotation.y = (1 - (1 - spinK) ** 3) * PI * 6;
          const shakeK = THREE.MathUtils.clamp((t - 1.1) / (it.T_OPEN - 1.1), 0, 1);
          const amp = shakeK * shakeK * 0.35;
          c.g.rotation.z = Math.sin(t * (30 + shakeK * 40)) * amp;
          c.g.rotation.x = Math.cos(t * (24 + shakeK * 30)) * amp * 0.6;
          c.g.position.x = Math.sin(t * 57) * amp * 0.15;
          c.lid.rotation.x = Math.max(0, Math.sin(t * 25)) * shakeK * 0.35;
          c.g.scale.setScalar(0.62 * (1 + shakeK * 0.25 + Math.sin(t * 30) * shakeK * 0.05));
          const glowC = new THREE.Color(CHEST_TYPES[it.type].glow).lerp(it.color, Math.min(1, k2 * 1.6));
          c.glowMat.color.copy(glowC);
          c.glowMat.emissive.copy(glowC);
          c.glowMat.emissiveIntensity = 2 + k2 * 10;
          c.innerGlow.material.color.copy(glowC);
          c.innerGlow.material.opacity = shakeK;
          it.aura.material.opacity = 0.05 + k2 * 0.2 + Math.sin(t * 20) * 0.04 * k2;
          it.aura.scale.setScalar(0.45 + k2 * 0.5);
          light.color.copy(glowC);
          lightK = Math.max(lightK, 0.3 + k2 * 0.9);
          light.position.copy(it.root.position);
          if (Math.random() < dt * (8 + shakeK * 40)) burst(it.root.getWorldPosition(tmp), 1, 1.5, [it.color.getHex(), 0xffffff], 1.5);
          if (shakeK > 0 && !it.rumbled) {
            it.rumbled = true;
            play('rumble');
          }
        } else {
          // 轉幾個圈，啱啱好喺開蓋嗰陣面向你
          c.g.rotation.y = (1 - (1 - Math.min(1, t / it.T_OPEN)) ** 2) * PI * 4;
          c.g.rotation.z = Math.sin(t * 40) * k2 * k2 * 0.12;
          c.lid.rotation.x = Math.max(0, Math.sin(t * 30)) * k2 * 0.2;
          c.glowMat.emissiveIntensity = 2 + k2 * 4;
          c.innerGlow.material.opacity = k2 * 0.8;
        }
        if (t >= it.T_OPEN) reveal(it);
      } else {
        // 開咗：蓋打開、寵物升出嚟轉一個圈
        const k3 = t - it.revealT;
        const c = it.chest;
        // 去咗轉圈：個空箱縮細收埋，淨係寵物轉（少啲嘢要畫）
        if (it.orbit && c.g.visible) {
          it.chestK = Math.max(0, (it.chestK ?? 1) - dt * 2.5);
          c.g.scale.setScalar(0.52 * it.chestK);
          if (it.chestK <= 0) c.g.visible = false;
        }
        if (!it.rare) {
          c.g.rotation.set(0, 0, 0);
          c.lid.rotation.x = Math.min(2.0, k3 * 10);
          c.innerGlow.material.color.copy(it.color);
          c.innerGlow.material.opacity = Math.max(0.3, 1 - k3);
          c.glowMat.emissiveIntensity = 2;
        }
        const rise = Math.min(1, k3 / 0.35);
        const e = 1 - (1 - rise) ** 3;
        it.prize.g.scale.setScalar(Math.max(0.01, e));
        it.prize.g.position.y = it.rare ? -0.35 + e * 0.1 : 0.05 * e - 0.1 * (1 - e);
        it.prize.g.rotation.y = rise < 1 ? (1 - e) * PI * 2 : Math.sin(k3 * 1.6) * 0.35;
        it.prize.animate?.(clock);
        it.label.position.y = it.prize.g.position.y + it.prizeH + 0.08;
        it.label.material.opacity = it.leaving ? Math.max(0, 1 - it.leaveT / 0.3) : Math.min(1, k3 * 4);
        // 稀有：寵物周圍閃閃
        if (it.rare && !it.leaving && Math.random() < dt * (it.big ? 14 : 7)) {
          const p = it.root.getWorldPosition(tmp);
          p.y += it.prizeH * 0.5 * it.scale;
          burst(p, 1, 1.2, [it.color.getHex(), 0xffffff], 1.2);
        }
      }
    }
    // 燈慢慢暗返
    lightK = Math.max(0, lightK - dt * 1.2);
    light.intensity = lightK * 14;
    if (!items.some((o) => o.rare && !o.opened)) {
      const newest = items[items.length - 1];
      if (newest) light.position.copy(newest.root.position).add(tmp.set(0, 0.6, 0));
    }
    // 粒子
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      p.v.y -= 6 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.set(p.t * p.spin, p.t * p.spin * 0.7, 0);
      p.m.scale.setScalar(Math.max(0.001, p.s * (1 - p.t / p.life)));
      if (p.t > p.life) {
        world.remove(p.m);
        parts.splice(i, 1);
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.t += dt;
      const k = f.t / f.life;
      f.m.scale.setScalar(0.2 + k * f.size);
      f.m.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) {
        world.remove(f.m);
        f.m.material.dispose();
        flashes.splice(i, 1);
      }
    }
  };

  return api;
}

let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
#chest-flash { position: fixed; inset: 0; z-index: 25; pointer-events: none; opacity: 0; background: radial-gradient(circle at 50% 45%, #fff 0%, var(--c, #fff) 35%, transparent 75%); }
#chest-flash.on { animation: chest-flash 0.6s ease-out; }
@keyframes chest-flash { 0% { opacity: 0.85; } 100% { opacity: 0; } }
`;
  document.head.appendChild(st);
  const d = document.createElement('div');
  d.id = 'chest-flash';
  document.body.appendChild(d);
}
