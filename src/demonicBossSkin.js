// 😈 Demonic Boss Skin（小朋友 Issue #11：🧙 Witch Tower 獎品）
// 解鎖咗（state.demonicBossSkin，用 demonicRewards.js 嘅 unlockDemonicBossSkin()）之後，行去任何一個生態區 Boss 隔籬撳 E：
//   普通 → ☄️ Meteoric（有買先有）→ 😈 Demonic → 普通…… 輪住換
// 個樣：炭黑 + 深紅身、熔岩發光眼、頭頂一對大彎角 + 一撮火、背後一對蝙蝠翼（會拍）、三粒火球圍住轉、紅色光環
// 每個 Boss 自己記：state.bossSkins = { [biome]: 'meteoric' | 'demonic' }（同 meteorBossSkin.js 共用）
//
// 做法同 meteorBossSkin.js 一樣：逐個 mesh 換材質（舊材質記喺 userData.demonOrig），另外加一組裝飾
//
// main.js 用法：
//   const demonicBossSkins = createDemonicBossSkins(bosses)
//   demonicBossSkins.update(dt, time)
//   demonicBossSkins.interaction(pos, carrying) → { prompt, action } | null（未解鎖 = null，交返俾 meteorBossSkin 處理）

import * as THREE from 'three';
import { state, save } from './state.js';
import { play } from './sound.js';
import { short } from './format.js';
import { setBossMeteoric } from './meteorBossSkin.js';
import { glowMat } from './meteorPetModels.js';
import { pivot } from './echoPetModels.js';
import { horn, batWing, fireTuft, LAVA, EMBER, FIRE } from './demonicPetModels.js';

const DEMON_HUE = 0.99;
const AURA = new THREE.Color(0xff1744);
const cache = new Map(); // 原本材質 → 惡魔材質

function demonMaterial(orig) {
  if (cache.has(orig)) return cache.get(orig);
  let m = orig;
  if (orig.isMeshStandardMaterial) {
    m = orig.clone();
    const hsl = {};
    orig.color.getHSL(hsl);
    const glowing = orig.emissiveIntensity > 0.5 && orig.emissive.getHex() !== 0;
    if (glowing) {
      // 眼、符文：變熔岩橙
      m.color.setHex(EMBER);
      m.emissive.setHex(LAVA);
      m.emissiveIntensity = Math.max(2.4, orig.emissiveIntensity);
    } else {
      // 其他：深淺跟返原本，深色 = 炭黑、淺色 = 深紅
      m.color.setHSL(DEMON_HUE, 0.75, 0.06 + hsl.l * 0.32);
      m.emissive.setHex(0x3a0000);
      m.emissiveIntensity = 0.35;
      m.metalness = Math.max(orig.metalness, 0.15);
      m.roughness = Math.min(orig.roughness, 0.55);
    }
  }
  cache.set(orig, m);
  return m;
}

// 喺某個部位個框嘅頂（本地座標）
function topOf(part) {
  const box = new THREE.Box3().setFromObject(part);
  const size = box.getSize(new THREE.Vector3());
  const top = part.worldToLocal(new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2));
  const back = part.worldToLocal(new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y - size.y * 0.25, box.max.z));
  const ws = part.getWorldScale(new THREE.Vector3()).x;
  return { size, top, back, ws };
}

function buildDecor(b) {
  const { rig } = b;
  b.group.updateMatrixWorld(true);
  const fire = [glowMat(FIRE, 2.2, { transparent: true, opacity: 0.9 }), glowMat(LAVA, 2.8, { transparent: true, opacity: 0.92 }), glowMat(EMBER, 3.4)];
  const parts = [];
  // 頭：大彎角 + 一撮火
  const H = topOf(rig.head);
  const k = (Math.max(H.size.x, H.size.z) / H.ws) * 1.6;
  const crown = pivot(rig.head, H.top.x, H.top.y - 0.05 * k, H.top.z);
  for (const s of [-1, 1]) horn(crown, s * 0.3 * k, 0, 0, 2.6 * k, s, { color: 0x2b0d0f });
  const flame = fireTuft(crown, 0, 0, 0.05 * k, 0.9 * k, fire);
  parts.push(crown);
  // 背：蝙蝠翼
  const T = topOf(rig.torso || rig.root);
  const kw = (Math.max(T.size.x, T.size.y) / T.ws) * 1.4;
  const wings = [-1, 1].map((s) => {
    const p = pivot(rig.torso || rig.root, T.back.x + s * 0.08 * kw, T.back.y, T.back.z);
    batWing(p, 0, 0, 0, kw, s, 0x6a1018, LAVA, { membrane: { emissive: 0x5a0000, emissiveIntensity: 0.7 }, bone: glowMat(LAVA, 2) });
    parts.push(p);
    return p;
  });
  // 三粒火球圍住轉（放喺 group：唔跟 Boss 嬲起上嚟變大）
  const orbit = new THREE.Group();
  const balls = [0, 1, 2].map((i) => {
    const p = pivot(orbit);
    const f = fireTuft(p, 1.9, -0.15, 0, 1.1, fire);
    p.rotation.y = (i / 3) * Math.PI * 2;
    return f;
  });
  orbit.position.y = 2.2;
  b.group.add(orbit);
  parts.push(orbit);
  return { parts, orbit, balls, wings, flame, fire };
}

export function setBossDemonic(b, on) {
  if (!!b.demonSkin === on) return;
  b.demonSkin = on;
  b.rig.g.traverse((o) => {
    if (!o.isMesh || o.userData.demonDecor) return;
    if (on) {
      if (o.userData.demonOrig) return;
      o.userData.demonOrig = o.material;
      o.material = Array.isArray(o.material) ? o.material.map(demonMaterial) : demonMaterial(o.material);
      o.userData.demonMat = o.material;
    } else if (o.userData.demonOrig) {
      if (o.material === o.userData.demonMat) o.material = o.userData.demonOrig; // 其他模組換咗就唔郁
      delete o.userData.demonOrig;
      delete o.userData.demonMat;
    }
  });
  if (on) {
    b.demonDecor = buildDecor(b);
    b.demonDecor.parts.forEach((p) => p.traverse((o) => (o.userData.demonDecor = true)));
    b.demonAuraOrig ??= b.auraColor.clone();
    b.auraColor.copy(AURA);
    if (b.shards[0]) {
      b.demonShardOrig ??= { c: b.shards[0].material.color.clone(), e: b.shards[0].material.emissive.clone() };
      b.shards[0].material.color.setHex(FIRE);
      b.shards[0].material.emissive.setHex(FIRE);
    }
  } else {
    b.demonDecor?.parts.forEach((p) => p.removeFromParent());
    b.demonDecor = null;
    if (b.demonAuraOrig) b.auraColor.copy(b.demonAuraOrig);
    if (b.demonShardOrig && b.shards[0]) {
      b.shards[0].material.color.copy(b.demonShardOrig.c);
      b.shards[0].material.emissive.copy(b.demonShardOrig.e);
    }
  }
  b.label.userData.setLines?.([
    { text: `${on ? '😈 DEMONIC ' : ''}BOSS: ${b.info.name}`, color: on ? '#ff6d00' : '#ff5252' },
    { text: `${short(b.info.speed)} Speed`, color: '#ffeb3b' },
  ]);
}

// 換做某個皮膚（'normal'／'meteoric'／'demonic'）：先除晒，再着返
export function setBossSkin(b, id) {
  setBossDemonic(b, false);
  setBossMeteoric(b, false);
  if (id === 'meteoric') setBossMeteoric(b, true);
  if (id === 'demonic') setBossDemonic(b, true);
}

export function createDemonicBossSkins(bosses) {
  const skins = () => (state.bossSkins ||= {});
  for (const b of bosses) if (state.bossSkins?.[b.biome] === 'demonic') setBossDemonic(b, true);

  const api = {
    update(dt, time) {
      for (const b of bosses) {
        const d = b.demonDecor;
        if (!d) continue;
        d.orbit.rotation.y = time * 1.1;
        d.orbit.position.y = 2.2 + Math.sin(time * 1.8) * 0.2;
        d.balls.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(time * 10 + i * 2) * 0.25, 1));
        d.flame.scale.set(1, 0.8 + Math.sin(time * 9) * 0.22, 1);
        d.wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.5 + Math.sin(time * (b.mode === 'chase' ? 12 : 4)) * 0.45)));
        d.fire[1].emissiveIntensity = 2.5 + Math.sin(time * 8) * 0.5;
      }
    },
    // 解鎖咗先理（未解鎖：null → meteorBossSkin.js 照舊處理）
    interaction(pos, carrying) {
      if (carrying || !state.demonicBossSkin) return null;
      const b = bosses.find((x) => x.mode !== 'chase' && Math.hypot(pos.x - x.group.position.x, pos.z - x.group.position.z) < Math.min(7, 3 * x.group.scale.x));
      if (!b) return null;
      const order = ['normal', ...(state.meteorBossSkin ? ['meteoric'] : []), 'demonic'];
      const now = skins()[b.biome] || 'normal';
      const next = order[(Math.max(0, order.indexOf(now)) + 1) % order.length];
      const text = { normal: `🦹 Change ${b.info.name} back to the normal skin`, meteoric: `☄️ Give ${b.info.name} the METEORIC skin!`, demonic: `😈 Give ${b.info.name} the DEMONIC skin!` }[next];
      return {
        prompt: `<kbd>E</kbd> ${text}`,
        action: () => {
          if (next === 'normal') delete skins()[b.biome];
          else skins()[b.biome] = next;
          setBossSkin(b, next);
          save();
          play(next === 'demonic' ? 'demonic' : next === 'meteoric' ? 'magic' : 'click');
        },
      };
    },
  };
  return api;
}
