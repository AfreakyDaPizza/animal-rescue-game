// 🦹 Meteoric Boss Skin（小朋友 Issue #10）：喺 ☄️ Meteoric Shop 買（500 💎），之後行去任何一個生態區 Boss 隔籬撳 E
// 就可以將嗰個 Boss 轉做「隕石」皮膚（深藍石頭身、發光藍眼、頭頂水晶、身邊有細隕石轉），再撳一次轉返正常
// 每個 Boss 自己記：state.bossSkins = { [biome]: 'meteoric' }
//
// 做法：逐個 mesh 換材質（舊材質記喺 mesh.userData.meteorOrig），另外加一組裝飾（頭頂水晶 + 圍住轉嘅隕石）
// 只係換返「自己換落去」嘅材質：如果其他模組（例如 Meteor 活動嘅「受傷」樣）之後換咗，就唔會亂咗佢
//
// main.js 用法：
//   const bossSkins = createMeteorBossSkins(bosses)
//   bossSkins.update(dt, time)
//   bossSkins.interaction(pos, carrying) → { prompt, action } | null

import * as THREE from 'three';
import { state, save } from './state.js';
import { play } from './sound.js';
import { short } from './format.js';
import { CYAN, AQUA, ROCK3, glowMat, crystalCluster } from './meteorPetModels.js';
import { B, pivot } from './echoPetModels.js';

const NAVY_HUE = 0.63;
const AURA = new THREE.Color(CYAN);
const cache = new Map(); // 原本材質 → 隕石材質
const crystalM = glowMat(CYAN, 1.8, { roughness: 0.1 });
const rockM = glowMat(ROCK3, 0.25);

function meteorMaterial(orig) {
  if (cache.has(orig)) return cache.get(orig);
  let m = orig;
  if (orig.isMeshStandardMaterial) {
    m = orig.clone();
    const hsl = {};
    orig.color.getHSL(hsl);
    const glowing = orig.emissiveIntensity > 0.5 && orig.emissive.getHex() !== 0;
    if (glowing) {
      // 眼、符文：變藍色發光
      m.color.setHex(AQUA);
      m.emissive.setHex(CYAN);
      m.emissiveIntensity = Math.max(2.4, orig.emissiveIntensity);
    } else {
      // 其他：深淺跟返原本，但全部變隕石藍（深色 = 深藍石，淺色 = 淺藍）
      m.color.setHSL(NAVY_HUE, 0.5, 0.1 + hsl.l * 0.4);
      m.emissive.setHex(0x0d2a6b);
      m.emissiveIntensity = 0.35;
      m.metalness = Math.max(orig.metalness, 0.25);
      m.roughness = Math.min(orig.roughness, 0.45);
    }
  }
  cache.set(orig, m);
  return m;
}

// 裝飾：頭頂一撮水晶 + 兩邊膊頭水晶 + 3 粒細隕石圍住 Boss 轉
function buildDecor(b) {
  const { rig } = b;
  b.group.updateMatrixWorld(true);
  // 用個頭嘅大細決定水晶幾大
  const box = new THREE.Box3().setFromObject(rig.head);
  const size = box.getSize(new THREE.Vector3());
  const top = rig.head.worldToLocal(new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2));
  const ws = rig.head.getWorldScale(new THREE.Vector3()).x;
  const k = (Math.max(size.x, size.z) / ws) * 2.2;
  const parts = [];
  const crown = crystalCluster(rig.head, k, top.x, top.y - 0.05 * k, top.z, crystalM);
  parts.push(crown);
  for (const arm of rig.arms || []) {
    const c = crystalCluster(arm, k * 0.6, 0, 0.1 * k, 0, crystalM, arm.position.x > 0 ? -0.5 : 0.5);
    parts.push(c);
  }
  // 圍住轉嘅隕石（放喺 group，唔跟 Boss 嬲起上嚟變大）
  const orbit = new THREE.Group();
  const rocks = [0, 1, 2].map((i) => {
    const p = pivot(orbit);
    B(p, 0.32, 0.28, 0.3, ROCK3, 1.9, 0, 0, rockM, { line: 0.08, r: 0.35 });
    crystalCluster(p, 0.8, 1.9, 0.1, 0, crystalM);
    p.rotation.y = (i / 3) * Math.PI * 2;
    return p;
  });
  orbit.position.y = 2.3;
  b.group.add(orbit);
  parts.push(orbit);
  return { parts, orbit, rocks };
}

export function setBossMeteoric(b, on) {
  if (!!b.meteorSkin === on) return;
  b.meteorSkin = on;
  b.rig.g.traverse((o) => {
    if (!o.isMesh || o.userData.meteorDecor) return;
    if (on) {
      if (o.userData.meteorOrig) return;
      o.userData.meteorOrig = o.material;
      o.material = Array.isArray(o.material) ? o.material.map(meteorMaterial) : meteorMaterial(o.material);
      o.userData.meteorMat = o.material;
    } else if (o.userData.meteorOrig) {
      if (o.material === o.userData.meteorMat) o.material = o.userData.meteorOrig; // 其他模組換咗就唔郁
      delete o.userData.meteorOrig;
      delete o.userData.meteorMat;
    }
  });
  if (on) {
    b.meteorDecor = buildDecor(b);
    b.meteorDecor.parts.forEach((p) => p.traverse((o) => (o.userData.meteorDecor = true)));
    b.meteorAuraOrig ??= b.auraColor.clone();
    b.auraColor.copy(AURA);
    if (b.shards[0]) {
      b.meteorShardOrig ??= { c: b.shards[0].material.color.clone(), e: b.shards[0].material.emissive.clone() };
      b.shards[0].material.color.setHex(CYAN);
      b.shards[0].material.emissive.setHex(CYAN);
    }
  } else {
    b.meteorDecor?.parts.forEach((p) => p.removeFromParent());
    b.meteorDecor = null;
    if (b.meteorAuraOrig) b.auraColor.copy(b.meteorAuraOrig);
    if (b.meteorShardOrig && b.shards[0]) {
      b.shards[0].material.color.copy(b.meteorShardOrig.c);
      b.shards[0].material.emissive.copy(b.meteorShardOrig.e);
    }
  }
  b.label.userData.setLines?.([
    { text: `${on ? '☄️ METEORIC ' : ''}BOSS: ${b.info.name}`, color: on ? '#40c4ff' : '#ff5252' },
    { text: `${short(b.info.speed)} Speed`, color: '#ffeb3b' },
  ]);
}

export function createMeteorBossSkins(bosses) {
  const skins = () => (state.bossSkins ||= {});
  for (const b of bosses) if (state.bossSkins?.[b.biome] === 'meteoric') setBossMeteoric(b, true);

  return {
    update(dt, time) {
      for (const b of bosses) {
        if (!b.meteorDecor) continue;
        const { orbit, rocks } = b.meteorDecor;
        orbit.rotation.y = time * 0.9;
        rocks.forEach((r, i) => (r.children[0].rotation.set(time * 1.5 + i, time * 2 + i, 0)));
        orbit.position.y = 2.3 + Math.sin(time * 1.6) * 0.2;
      }
      crystalM.emissiveIntensity = 1.5 + Math.sin(time * 2.6) * 0.6;
    },
    // 行到 Boss 隔籬（佢冇追緊你）：撳 E 換皮膚。未買：提你去 Meteoric Shop 買
    interaction(pos, carrying) {
      if (carrying) return null;
      const b = bosses.find((x) => x.mode !== 'chase' && Math.hypot(pos.x - x.group.position.x, pos.z - x.group.position.z) < Math.min(7, 3 * x.group.scale.x));
      if (!b) return null;
      if (!state.meteorBossSkin) return { prompt: `🦹 Buy the Meteoric Boss Skin at the ☄️ Meteoric Shop (in the Hub) to change ${b.info.name}'s look!` };
      const on = skins()[b.biome] === 'meteoric';
      return {
        prompt: on ? `<kbd>E</kbd> 🦹 Change ${b.info.name} back to the normal skin` : `<kbd>E</kbd> ☄️ Give ${b.info.name} the METEORIC skin!`,
        action: () => {
          if (on) delete skins()[b.biome];
          else skins()[b.biome] = 'meteoric';
          setBossMeteoric(b, !on);
          save();
          play(on ? 'click' : 'magic');
        },
      };
    },
  };
}
