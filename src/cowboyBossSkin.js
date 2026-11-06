// 🤠 Cowboy Boss Skin（小朋友 Issue #16：⭐ Special's Stall 50 🤠 Tame Tokens）
// 買咗（state.cowboyBossSkin = true）之後，行去任何一個生態區 Boss 隔籬撳 E 就輪住換皮膚：
//   普通 →（☄️ Meteoric，有買先有）→（😈 Demonic，有解鎖先有）→ 🤠 Cowboy → 普通……
// 個樣：原本頂帽收埋，換一頂大牛仔帽（金星帽帶）+ 紅頸巾 + 牛仔靴（馬刺）+ 腰間一卷套索；追人嗰陣頭頂揮住一個轉緊嘅套索！
// 每個 Boss 自己記：state.bossSkins = { [biome]: 'meteoric' | 'demonic' | 'cowboy' }（同 meteorBossSkin.js／demonicBossSkin.js 共用）
//
// 做法：唔換材質（Boss 仍然認得出係邊個），淨係收埋原本頭頂嘅帽（頭頂以上嘅零件），再加一組裝飾（userData.cowboyDecor）
//
// main.js 用法：
//   const cowboyBossSkins = createCowboyBossSkins(bosses)
//   cowboyBossSkins.update(dt, time)
//   cowboyBossSkins.interaction(pos, carrying) → { prompt, action } | null（未買 = null，交返俾其他皮膚處理）

import * as THREE from 'three';
import { state, save } from './state.js';
import { play } from './sound.js';
import { short } from './format.js';
import { setBossSkin } from './demonicBossSkin.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const M = {
  hat: std(0x9a6233),
  hatDark: std(0x6d4022),
  band: std(0x3e2412),
  red: std(0xd32f2f),
  boot: std(0x5d3a1a, { roughness: 0.5 }),
  sole: std(0x2b1a0e),
  rope: std(0xe0b276, { roughness: 0.95 }),
  gold: std(0xffc400, { metalness: 0.8, roughness: 0.3, emissive: 0x4a3000, emissiveIntensity: 0.5 }),
  silver: std(0xcfd8dc, { metalness: 0.8, roughness: 0.3 }),
};
const G = {
  brim: (() => {
    const g = new THREE.CylinderGeometry(1, 1, 0.06, 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.max(0, Math.abs(p.getX(i)) - 0.5) ** 2 * 0.9);
    g.computeVertexNormals();
    return g;
  })(),
  crown: new THREE.CylinderGeometry(0.52, 0.6, 0.62, 16).translate(0, 0.31, 0),
  dent: new THREE.BoxGeometry(0.18, 0.1, 0.8),
  band: new THREE.CylinderGeometry(0.61, 0.62, 0.13, 16, 1, true).translate(0, 0.09, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  tri: new THREE.ConeGeometry(1, 1, 3),
  star: (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.45 : 1;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
  })(),
  coil: new THREE.TorusGeometry(1, 0.12, 6, 24),
  lasso: new THREE.TorusGeometry(1, 0.04, 6, 40),
};

const add = (parent, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
};

// 喺某個部位嘅框（本地座標）
function boxOf(part) {
  const box = new THREE.Box3().setFromObject(part);
  const size = box.getSize(new THREE.Vector3());
  const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
  const lb = box.clone().applyMatrix4(inv);
  const ws = part.getWorldScale(new THREE.Vector3()).x;
  return { lb, size, ws };
}

function buildDecor(b) {
  const { rig } = b;
  b.group.updateMatrixWorld(true);
  const parts = [];
  const hidden = [];
  // 1) 頭：收埋原本頭頂嘅帽（頭頂以上 / 頭殼外面嘅零件），戴牛仔帽
  const head = rig.head;
  for (const ch of head.children) {
    if (ch.isMesh && ch.position.y > 0.28 && ch.visible) {
      ch.visible = false;
      hidden.push(ch);
    }
  }
  b.group.updateMatrixWorld(true);
  // 個頭殼 = 頭入面第一個 mesh（box(head, …) 第一個砌嘅）；Box3.setFromObject 會連埋收埋咗嘅帽計，所以自己量
  const skull = head.children.find((c) => c.isMesh) || head;
  if (skull.geometry && !skull.geometry.boundingBox) skull.geometry.computeBoundingBox();
  const H = { lb: skull.geometry ? skull.geometry.boundingBox.clone().applyMatrix4(skull.matrix) : boxOf(head).lb };
  const hw = Math.max(H.lb.max.x - H.lb.min.x, H.lb.max.z - H.lb.min.z);
  const hatK = hw * 0.85;
  const hat = new THREE.Group();
  hat.position.set((H.lb.min.x + H.lb.max.x) / 2, H.lb.max.y - 0.04, (H.lb.min.z + H.lb.max.z) / 2);
  hat.rotation.set(-0.08, 0, 0.1);
  hat.scale.setScalar(hatK);
  head.add(hat);
  add(hat, G.brim, M.hat, 0, 0, 0, 1, 1, 0.88);
  add(hat, G.crown, M.hat, 0, 0, 0, 1, 1, 0.86);
  add(hat, G.dent, M.hatDark, 0, 0.6, 0, 1, 1, 0.7);
  add(hat, G.band, M.band, 0, 0, 0, 1, 1, 0.86);
  add(hat, G.star, M.gold, 0, 0.1, -0.54, 0.1, 0.1, 0.1);
  parts.push(hat);
  // 2) 紅頸巾：頭下面一圈 + 前面一個三角
  const scarf = new THREE.Group();
  scarf.position.set((H.lb.min.x + H.lb.max.x) / 2, H.lb.min.y, (H.lb.min.z + H.lb.max.z) / 2);
  head.add(scarf);
  add(scarf, G.box, M.red, 0, 0, 0, hw * 0.95, 0.12, hw * 0.95);
  add(scarf, G.tri, M.red, 0, -0.16, -hw * 0.48, hw * 0.3, 0.32, 0.06, Math.PI, 0, 0);
  parts.push(scarf);
  // 3) 牛仔靴 + 馬刺（每隻腳最底）
  for (const leg of rig.legs || []) {
    const L = boxOf(leg);
    const lw = Math.max(L.lb.max.x - L.lb.min.x, 0.2);
    const ld = Math.max(L.lb.max.z - L.lb.min.z, 0.2);
    const boot = new THREE.Group();
    boot.position.set((L.lb.min.x + L.lb.max.x) / 2, L.lb.min.y, (L.lb.min.z + L.lb.max.z) / 2);
    leg.add(boot);
    add(boot, G.box, M.boot, 0, 0.22, 0, lw * 1.12, 0.44, ld * 1.12);
    add(boot, G.box, M.boot, 0, 0.08, -ld * 0.35, lw * 1.05, 0.16, ld * 0.7);
    add(boot, G.box, M.sole, 0, 0.02, ld * 0.38, lw * 0.8, 0.08, ld * 0.3);
    add(boot, G.box, M.hatDark, 0, 0.42, 0, lw * 1.2, 0.07, ld * 1.2);
    add(boot, G.star, M.silver, 0, 0.12, ld * 0.62, 0.07, 0.07, 0.07, 0, Math.PI / 2, 0);
    parts.push(boot);
  }
  // 4) 腰間一卷套索（喺身側）
  const body = rig.torso || rig.root;
  const T = boxOf(body);
  const coil = new THREE.Group();
  coil.position.set(T.lb.max.x + 0.04, T.lb.min.y + (T.lb.max.y - T.lb.min.y) * 0.25, (T.lb.min.z + T.lb.max.z) / 2);
  coil.rotation.y = Math.PI / 2;
  body.add(coil);
  for (let i = 0; i < 3; i++) add(coil, G.coil, M.rope, 0, 0, i * 0.05, 0.22 - i * 0.015);
  parts.push(coil);
  // 5) 頭頂揮住嘅套索（追人先出）：放喺 group，唔跟 Boss 嬲起上嚟變大
  const spin = new THREE.Group();
  spin.position.y = 4.1;
  const loop = add(spin, G.lasso, M.rope, 0, 0, 0, 1.3, 1.3, 1.3, Math.PI / 2);
  const knot = add(spin, G.box, M.hatDark, 1.3, 0, 0, 0.18, 0.12, 0.12);
  spin.visible = false;
  b.group.add(spin);
  parts.push(spin);
  return { parts, hidden, spin, loop, knot };
}

export function setBossCowboy(b, on) {
  if (!!b.cowboySkin === on) return;
  b.cowboySkin = on;
  if (on) {
    b.cowboyDecor = buildDecor(b);
    b.cowboyDecor.parts.forEach((p) => p.traverse((o) => (o.userData.cowboyDecor = true)));
  } else {
    b.cowboyDecor?.parts.forEach((p) => p.removeFromParent());
    b.cowboyDecor?.hidden.forEach((m) => (m.visible = true));
    b.cowboyDecor = null;
  }
  b.label.userData.setLines?.([
    { text: `${on ? '🤠 COWBOY ' : ''}BOSS: ${b.info.name}`, color: on ? '#ff9e40' : '#ff5252' },
    { text: `${short(b.info.speed)} Speed`, color: '#ffeb3b' },
  ]);
}

// 換做某個皮膚（'normal'／'meteoric'／'demonic'／'cowboy'）
export function setBossSkinAll(b, id) {
  setBossCowboy(b, false);
  setBossSkin(b, id === 'cowboy' ? 'normal' : id);
  if (id === 'cowboy') setBossCowboy(b, true);
}

export function createCowboyBossSkins(bosses) {
  const skins = () => (state.bossSkins ||= {});
  for (const b of bosses) if (state.bossSkins?.[b.biome] === 'cowboy') setBossCowboy(b, true);

  return {
    update(dt, time) {
      for (const b of bosses) {
        const d = b.cowboyDecor;
        if (!d) continue;
        // 追人嗰陣：頭頂揮套索（轉 + 斜斜搖）
        d.spin.visible = b.mode === 'chase';
        if (d.spin.visible) {
          d.spin.rotation.y = time * 7;
          d.spin.rotation.z = Math.sin(time * 3) * 0.2;
        }
      }
    },
    // 買咗先理（未買：null → demonicBossSkin／meteorBossSkin 照舊處理）
    interaction(pos, carrying) {
      if (carrying || !state.cowboyBossSkin) return null;
      const b = bosses.find((x) => x.mode !== 'chase' && Math.hypot(pos.x - x.group.position.x, pos.z - x.group.position.z) < Math.min(7, 3 * x.group.scale.x));
      if (!b) return null;
      const order = ['normal', ...(state.meteorBossSkin ? ['meteoric'] : []), ...(state.demonicBossSkin ? ['demonic'] : []), 'cowboy'];
      const now = skins()[b.biome] || 'normal';
      const next = order[(Math.max(0, order.indexOf(now)) + 1) % order.length];
      const text = { normal: `🦹 Change ${b.info.name} back to the normal skin`, meteoric: `☄️ Give ${b.info.name} the METEORIC skin!`, demonic: `😈 Give ${b.info.name} the DEMONIC skin!`, cowboy: `🤠 Give ${b.info.name} the COWBOY skin! Yee-haw!` }[next];
      return {
        prompt: `<kbd>E</kbd> ${text}`,
        action: () => {
          if (next === 'normal') delete skins()[b.biome];
          else skins()[b.biome] = next;
          setBossSkinAll(b, next);
          save();
          play(next === 'demonic' ? 'demonic' : next === 'normal' ? 'click' : 'magic');
        },
      };
    },
  };
}
