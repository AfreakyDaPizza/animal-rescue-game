// 🎣 Halloween 釣魚（小朋友 2026-10-19）：喺釣魚湖嘅碼頭／岸邊釣 Halloween 蛋
// 流程：E 拋竿 → 等（魚竿越好越快）→ 浮標一沉「!」→ 限時內撳 E → 蛋由水入面飛出嚟
// 魚竿：魚竿舖買（rodShop.js），返普通世界就斷（breakRod）
import * as THREE from 'three';
import { state } from './state.js';
import { FISHING_BITE_WINDOW, rarityInfo } from './data/balance.js';
import { buildHalloweenEgg } from './halloweenPets.js';
import { ROD_SHOP, FISH_SPOT, DOCK, LAKE_WATER, LAKE_SHORE, RUINS } from './halloweenShape.js';
import { addEgg } from './halloweenEggStore.js';
import { RODS, currentRod, rollFishEgg } from './rodShop.js';
import { makeLabel } from './signs.js';

const WATER_Y = -0.08;
const RARE = ['Legendary', 'Mythic', 'Eternal'];

// ---------- 魚竿模型（沿 +Y 伸出去）----------
function rodModel(rod, len = 2.4) {
  const g = new THREE.Group();
  const col = new THREE.Color(rod.color);
  const glow = new THREE.Color(rod.glow);
  const tier = RODS.indexOf(rod);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, len, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: tier > 7 ? 0.5 : 0.1 }));
  shaft.position.y = len / 2;
  g.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }));
  grip.position.y = 0.2;
  g.add(grip);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: tier > 4 ? 0.8 : 0.2 }));
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0.1, 0.5, 0);
  g.add(reel);
  // 竿頭發光（高級竿越光，仲有一粒粒閃光）
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06 + tier * 0.004, 10, 8), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1 + tier * 0.25 }));
  tip.position.y = len;
  g.add(tip);
  if (tier >= 9) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 20), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.8 }));
    ring.position.y = len;
    g.add(ring);
    g.userData.ring = ring;
  }
  if (tier >= 12) {
    const sparks = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: glow }));
      g.add(s);
      sparks.push(s);
    }
    g.userData.sparks = sparks;
  }
  g.userData.tip = new THREE.Vector3(0, len, 0);
  g.userData.len = len;
  return g;
}

// ---------- 魚竿舖旁邊：友善骷髏漁夫 + 燈籠；湖：發光魚、霧、沉船桅杆 ----------
function buildDecor(scene) {
  const root = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111 });
  // 骷髏 Sam：企喺櫃枱後面（舖頭面向 +x）
  const sam = new THREE.Group();
  sam.position.set(ROD_SHOP.x - 0.9, 0, ROD_SHOP.z);
  sam.rotation.y = -Math.PI / 2; // 面向 +x
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), bone);
  skull.position.y = 2.15;
  sam.add(skull);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x18ffff, emissive: 0x18ffff, emissiveIntensity: 2 }));
    eye.position.set(s * 0.15, 2.2, -0.36);
    sam.add(eye);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.3), bone);
  jaw.position.set(0, 1.86, -0.12);
  sam.add(jaw);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0xffca28 })); // 漁夫帽
  hat.position.y = 2.55;
  sam.add(hat);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x1565c0 })); // 背心
  body.position.y = 1.4;
  sam.add(body);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), bone);
    rib.position.set(0, 1.25 + i * 0.16, -0.19);
    sam.add(rib);
  }
  const arm = new THREE.Group();
  arm.position.set(0.42, 1.75, 0);
  const armBone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), bone);
  armBone.position.y = -0.3;
  arm.add(armBone);
  sam.add(arm);
  root.add(sam);
  // 燈籠（舖頭兩邊）
  const lanterns = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xffab40, emissive: 0xff6d00, emissiveIntensity: 2 }));
    l.position.set(ROD_SHOP.x + 1.2, 3.1, ROD_SHOP.z + s * 2.3);
    root.add(l);
    lanterns.push(l);
  }
  const lamp = new THREE.PointLight(0xffb74d, 14, 22, 1.6);
  lamp.position.set(ROD_SHOP.x + 2.5, 3.5, ROD_SHOP.z);
  root.add(lamp);
  // 大大個發光招牌（唔受燈光影響，黑麻麻都遠遠見到）：「🎣 ROD SHOP」
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#1a0f05';
  g2.fillRect(0, 0, 512, 160);
  g2.strokeStyle = '#ffb300';
  g2.lineWidth = 10;
  g2.strokeRect(8, 8, 496, 144);
  g2.font = 'bold 74px sans-serif';
  g2.textAlign = 'center';
  g2.textBaseline = 'middle';
  g2.lineWidth = 8;
  g2.strokeStyle = '#4e2600';
  g2.strokeText('🎣 ROD SHOP', 256, 70);
  g2.fillStyle = '#ffe082';
  g2.fillText('🎣 ROD SHOP', 256, 70);
  g2.font = 'bold 30px sans-serif';
  g2.fillStyle = '#b2ebf2';
  g2.fillText('Fish for Halloween eggs!', 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.6), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  board.position.set(ROD_SHOP.x + 1.6, 5.4, ROD_SHOP.z);
  board.rotation.y = Math.PI / 2; // 面向 +x（出生點）
  root.add(board);
  const back = board.clone();
  back.rotation.y = -Math.PI / 2; // 後面都睇到
  back.position.x -= 0.02;
  root.add(back);
  // 頂上一條暖黃色光柱（遠遠都知道舖頭喺邊）
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(ROD_SHOP.x, 15, ROD_SHOP.z);
  root.add(beam);
  // 由出生點石圈去舖頭：一路發光南瓜燈做路標
  const from = new THREE.Vector3(RUINS.x - RUINS.r + 2, 0, RUINS.z - 6);
  const to = new THREE.Vector3(ROD_SHOP.x + 4, 0, ROD_SHOP.z + 1);
  const markMat = new THREE.MeshStandardMaterial({ color: 0xff8f00, emissive: 0xff6d00, emissiveIntensity: 2.2 });
  for (let i = 0; i <= 5; i++) {
    const p = from.clone().lerp(to, i / 5);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    post.position.set(p.x, 0.5, p.z + 2.2);
    root.add(post);
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), markMat);
    pumpkin.scale.y = 0.8;
    pumpkin.position.set(p.x, 1.15, p.z + 2.2);
    root.add(pumpkin);
  }
  // 水底發光魚影
  const fish = [];
  const fishMat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.35, depthWrite: false });
  const fishGeo = new THREE.PlaneGeometry(1.2, 0.45);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(fishGeo, fishMat);
    f.rotation.x = -Math.PI / 2;
    root.add(f);
    fish.push({ f, cx: LAKE_WATER.minX + 8 + Math.random() * (LAKE_WATER.maxX - LAKE_WATER.minX - 16), cz: LAKE_WATER.minZ + 6 + Math.random() * (LAKE_WATER.maxZ - LAKE_WATER.minZ - 12), r: 2 + Math.random() * 5, s: 0.3 + Math.random() * 0.5, p: Math.random() * 6 });
  }
  // 沉船：斜咗嘅桅杆 + 破帆
  const wreck = new THREE.Group();
  wreck.position.set(LAKE_WATER.minX + 10, 0, LAKE_WATER.minZ + 12);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 9, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }));
  mast.position.y = 3;
  mast.rotation.z = 0.35;
  wreck.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), new THREE.MeshStandardMaterial({ color: 0x9e9d89, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  sail.position.set(-1.2, 4.6, 0.2);
  sail.rotation.z = 0.35;
  wreck.add(sail);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x2b1d14 }));
  hull.position.set(0.5, -0.2, 0);
  hull.rotation.set(0.2, 0.4, -0.25);
  wreck.add(hull);
  root.add(wreck);
  // 水面霧（幾塊淡淡嘅板）
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xb2dfdb, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const mist = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.4), mistMat);
    m.position.set(LAKE_WATER.minX + 10 + i * 6, 0.9, LAKE_WATER.minZ + 8 + ((i * 11) % (LAKE_WATER.maxZ - LAKE_WATER.minZ - 16)));
    m.rotation.y = i * 0.7;
    root.add(m);
    mist.push(m);
  }
  scene.add(root);
  return { root, sam, arm, jaw, lanterns, fish, mist };
}

// ---------- 主體 ----------
export function createFishing({ scene, camera, avatar }) {
  const fishing = {
    scene, camera, avatar,
    phase: 'idle', t: 0, waitLeft: 0, castFrom: null, target: new THREE.Vector3(),
    decor: null, handRod: null, avatarRod: null, rodIndex: -1,
    egg: null, eggPet: null, eggFrom: new THREE.Vector3(),
    debugBite: false,
  };
  // 浮標 + 魚絲 + 波紋 + 「!」
  const bob = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.8 }));
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  const glowDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffff8d }));
  glowDot.position.y = 0.2;
  bob.add(top, bottom, glowDot);
  bob.visible = false;
  scene.add(bob);
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 28), new THREE.MeshBasicMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2;
    scene.add(r);
    return r;
  });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe0f7fa, transparent: true, opacity: 0.85 }));
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);
  const bang = makeLabel([{ text: '❗', color: '#ffeb3b' }], 1.6);
  bang.visible = false;
  scene.add(bang);
  Object.assign(fishing, { bob, ripples, line, lineGeo, bang });
  return fishing;
}

// 拎住嘅魚竿：第一身擺喺鏡頭左下角，第三身擺喺左手
function syncRodModels(fishing) {
  const rod = currentRod();
  const idx = rod ? state.rod : -1;
  if (idx === fishing.rodIndex) return;
  fishing.handRod?.removeFromParent();
  fishing.avatarRod?.removeFromParent();
  fishing.handRod = fishing.avatarRod = null;
  fishing.rodIndex = idx;
  if (!rod) return;
  const hand = new THREE.Group();
  const hr = rodModel(rod, 1.4);
  hr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.15, 0.5, -0.85).normalize());
  hand.add(hr);
  hand.position.set(-0.42, -0.5, -0.7);
  fishing.camera.add(hand);
  hand.userData.rod = hr;
  fishing.handRod = hand;
  const av = new THREE.Group();
  const ar = rodModel(rod, 2.6);
  // 手臂向前 ~1 rad 嗰陣，竿向前向上
  ar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -0.46, -0.89).normalize());
  av.add(ar);
  av.position.set(0, -0.75, -0.05);
  av.userData.rod = ar;
  fishing.avatar.arms[0].add(av);
  fishing.avatarRod = av;
}

// 喺邊度釣得：碼頭（尾段）或者岸邊近水
export function canFishAt(x, z) {
  const onDock = x >= DOCK.minX - 0.5 && x <= DOCK.maxX && z >= DOCK.minZ - 0.6 && z <= DOCK.maxZ + 0.6;
  const onShore = x >= LAKE_SHORE.minX - 0.5 && x <= LAKE_SHORE.minX + 3.2 && z >= LAKE_SHORE.minZ && z <= LAKE_SHORE.maxZ;
  return onDock || onShore;
}

// 拋去邊：前面 7 米（夾返喺水入面，唔好拋落碼頭）
function castTarget(fishing, pos) {
  const fwd = new THREE.Vector3();
  fishing.camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 0.01) fwd.set(-1, 0, 0);
  fwd.normalize();
  if (fwd.x > -0.3) fwd.set(-1, 0, fwd.z * 0.5).normalize(); // 水喺 -x 嗰邊
  const t = new THREE.Vector3(pos.x + fwd.x * 7, WATER_Y, pos.z + fwd.z * 7);
  t.x = THREE.MathUtils.clamp(t.x, LAKE_WATER.minX + 2, LAKE_WATER.maxX - 1.5);
  t.z = THREE.MathUtils.clamp(t.z, LAKE_WATER.minZ + 2, LAKE_WATER.maxZ - 2);
  if (t.x > DOCK.minX - 0.5 && Math.abs(t.z) < DOCK.maxZ + 0.8) t.z = (t.z >= 0 ? 1 : -1) * (DOCK.maxZ + 1.6);
  return t;
}

// E 掣提示（main.js currentInteraction 用）
export function fishingInteraction(fishing, pos, { openShop, ui }) {
  if (Math.hypot(pos.x - ROD_SHOP.x - 2.6, pos.z - ROD_SHOP.z) < 3.4) return { prompt: '<kbd>E</kbd> 🎣 Talk to Skeleton Sam (Rod Shop)', action: openShop };
  if (fishing.phase === 'bite') return { prompt: '❗ <kbd>E</kbd> REEL IT IN NOW!', action: () => reel(fishing, ui) };
  if (fishing.phase === 'wait') return { prompt: '🎣 Waiting for a bite... (<kbd>E</kbd> reel in)', action: () => cancel(fishing, ui, '🎣 You reeled in... nothing. Wait for the ❗ next time!') };
  if (fishing.phase === 'cast' || fishing.phase === 'egg') return { prompt: '🎣 ...' };
  if (!canFishAt(pos.x, pos.z)) return null;
  if (!currentRod()) return { prompt: '🎣 You need a fishing rod! Buy one from Skeleton Sam at the Rod Shop.' };
  return { prompt: `<kbd>E</kbd> 🎣 Cast your ${currentRod().name}`, action: () => cast(fishing, pos, ui) };
}

function cast(fishing, pos, ui) {
  const rod = currentRod();
  if (!rod) return;
  fishing.phase = 'cast';
  fishing.t = 0;
  fishing.castFrom = { x: pos.x, z: pos.z };
  fishing.target.copy(castTarget(fishing, pos));
  fishing.waitLeft = rod.bite[0] + Math.random() * (rod.bite[1] - rod.bite[0]);
  ui.play('swoosh');
}

function cancel(fishing, ui, text) {
  fishing.phase = 'idle';
  fishing.bob.visible = fishing.line.visible = fishing.bang.visible = false;
  if (text) ui.popup(text);
}

function reel(fishing, ui) {
  const rod = currentRod();
  if (!rod) return cancel(fishing, ui);
  const pet = rollFishEgg(rod);
  fishing.eggPet = pet;
  fishing.egg = buildHalloweenEgg(pet.name, pet.rarity);
  const size = new THREE.Box3().setFromObject(fishing.egg).getSize(new THREE.Vector3());
  fishing.egg.scale.multiplyScalar(0.9 / Math.max(size.x, size.y, size.z));
  fishing.eggFrom.copy(fishing.bob.position);
  fishing.egg.position.copy(fishing.eggFrom);
  fishing.scene.add(fishing.egg);
  fishing.phase = 'egg';
  fishing.t = 0;
  fishing.bob.visible = fishing.bang.visible = false;
  ui.play('pop');
  ui.play('swoosh');
}

// 每格畫面（main.js：喺 updateThirdPerson 之後叫，咁先可以改手臂動作）
export function updateFishing(fishing, dt, time, { inside, pos, third, ui }) {
  if (inside && !fishing.decor) fishing.decor = buildDecor(fishing.scene);
  syncRodModels(fishing);
  const showRod = inside && !!currentRod();
  if (fishing.handRod) fishing.handRod.visible = showRod && !third;
  if (fishing.avatarRod) fishing.avatarRod.visible = showRod;
  for (const r of [fishing.handRod?.userData.rod, fishing.avatarRod?.userData.rod]) {
    if (!r) continue;
    if (r.userData.ring) r.userData.ring.rotation.x = time * 2;
    r.userData.sparks?.forEach((s, i) => {
      const a = time * 3 + i * 1.26;
      s.position.set(Math.cos(a) * 0.22, r.userData.len - 0.1 + Math.sin(time * 4 + i) * 0.15, Math.sin(a) * 0.22);
    });
  }
  // 湖嘅小動畫
  if (fishing.decor && inside) {
    const d = fishing.decor;
    d.arm.rotation.z = Math.sin(time * 2.2) * 0.5 + 0.6; // 骷髏 Sam 揮手
    d.jaw.position.y = 1.86 - Math.max(0, Math.sin(time * 6)) * 0.05;
    for (const f of d.fish) {
      const a = time * f.s + f.p;
      f.f.position.set(f.cx + Math.cos(a) * f.r, -0.25, f.cz + Math.sin(a) * f.r);
      f.f.rotation.z = -a - Math.PI / 2;
    }
    d.lanterns.forEach((l, i) => (l.material.emissiveIntensity = 1.6 + Math.sin(time * 5 + i * 2) * 0.4));
    d.mist.forEach((m, i) => (m.position.y = 0.8 + Math.sin(time * 0.4 + i) * 0.2));
  }

  // 離開岸邊／冇咗竿／出咗 Halloween 世界：收線
  if (fishing.phase !== 'idle' && fishing.phase !== 'egg' && (!inside || !currentRod() || Math.hypot(pos.x - fishing.castFrom.x, pos.z - fishing.castFrom.z) > 4)) {
    cancel(fishing, ui, inside && currentRod() ? '🎣 You walked away, so you reeled your line in.' : null);
  }

  const arm = fishing.avatar.arms[0];
  let armX = showRod ? 0.9 : null; // 拎住竿：手向前
  fishing.t += dt;
  if (fishing.phase === 'cast') {
    const k = Math.min(1, fishing.t / 0.65);
    armX = k < 0.35 ? 0.9 - (k / 0.35) * 1.6 : -0.7 + ((k - 0.35) / 0.65) * 2.1; // 向後拉 → 向前拋
    // 浮標拋物線飛出去
    const tip = rodTip(fishing, third);
    fishing.bob.visible = k > 0.4;
    const f = Math.max(0, (k - 0.4) / 0.6);
    fishing.bob.position.lerpVectors(tip, fishing.target, f);
    fishing.bob.position.y += Math.sin(f * Math.PI) * 3;
    if (k >= 1) {
      fishing.phase = 'wait';
      fishing.t = 0;
      ui.play('pop');
      fishing.ripT = 0;
    }
  } else if (fishing.phase === 'wait') {
    fishing.bob.position.set(fishing.target.x, WATER_Y + Math.sin(time * 2.5) * 0.04, fishing.target.z);
    fishing.waitLeft -= dt * (fishing.debugBite ? 20 : 1);
    if (fishing.waitLeft <= 0) {
      fishing.phase = 'bite';
      fishing.t = 0;
      fishing.ripT = 0;
      ui.play('splash');
      ui.popup('❗ Something bit! Press E NOW!');
    }
  } else if (fishing.phase === 'bite') {
    fishing.bob.position.set(fishing.target.x, WATER_Y - 0.18 + Math.sin(time * 22) * 0.06, fishing.target.z); // 一沉一沉
    fishing.bang.visible = true;
    fishing.bang.position.set(fishing.target.x, 1.4 + Math.sin(time * 10) * 0.1, fishing.target.z);
    armX = 0.9 + Math.sin(time * 18) * 0.08;
    if (fishing.t > FISHING_BITE_WINDOW * (fishing.debugBite ? 10 : 1)) cancel(fishing, ui, '💨 It got away! Press E faster when you see the ❗');
  } else if (fishing.phase === 'egg') {
    // 蛋由水度飛出嚟，飛落你面前
    const k = Math.min(1, fishing.t / 1.1);
    armX = 0.9 + Math.sin(k * Math.PI) * 0.9;
    const to = new THREE.Vector3(pos.x, pos.y - 0.3, pos.z);
    fishing.egg.position.lerpVectors(fishing.eggFrom, to, k);
    fishing.egg.position.y += Math.sin(k * Math.PI) * 4;
    fishing.egg.rotation.y += dt * 8;
    fishing.egg.userData.animate?.(time);
    if (k >= 1) {
      fishing.egg.removeFromParent();
      fishing.egg = null;
      fishing.phase = 'idle';
      const pet = fishing.eggPet;
      addEgg(pet.name, pet.rarity);
      ui.save();
      const info = rarityInfo(pet.rarity);
      ui.play(RARE.includes(pet.rarity) ? 'magic' : 'coin');
      ui.flash?.(info.color);
      if (RARE.includes(pet.rarity)) ui.announce(`${pet.rarity === 'Eternal' ? '🥁✨ ETERNAL CATCH!!! ' : '✨ '}You fished up a ${pet.rarity.toUpperCase()} ${pet.name} egg! 🥚`);
      else ui.popup(`🥚 You fished up a ${pet.rarity} ${pet.name} egg!`);
    }
  }
  // 魚絲：竿頭 → 浮標
  const lineOn = fishing.bob.visible && (fishing.phase === 'cast' || fishing.phase === 'wait' || fishing.phase === 'bite');
  fishing.line.visible = lineOn;
  if (lineOn) {
    const tip = rodTip(fishing, third);
    const p = fishing.lineGeo.attributes.position;
    p.setXYZ(0, tip.x, tip.y, tip.z);
    p.setXYZ(1, fishing.bob.position.x, fishing.bob.position.y + 0.15, fishing.bob.position.z);
    p.needsUpdate = true;
  }
  // 波紋：浮標落水同咬鈎嗰陣
  fishing.ripT = (fishing.ripT ?? 9) + dt * (fishing.phase === 'bite' ? 2.2 : 1);
  fishing.ripples.forEach((r, i) => {
    const k = ((fishing.ripT + i * 0.45) % 1.6) / 1.6;
    const on = fishing.phase === 'wait' || fishing.phase === 'bite';
    r.visible = on;
    if (!on) return;
    r.position.set(fishing.target.x, WATER_Y + 0.02, fishing.target.z);
    r.scale.setScalar(0.5 + k * (fishing.phase === 'bite' ? 4 : 2.5));
    r.material.opacity = (1 - k) * (fishing.phase === 'bite' ? 0.8 : 0.4);
  });
  // 第三身：左手拎竿（Minecraft 式直手）
  if (armX !== null && showRod && inside) arm.rotation.set(armX, 0, -0.1);
}

function rodTip(fishing, third) {
  const holder = third ? fishing.avatarRod : fishing.handRod;
  const r = holder?.userData.rod;
  if (!r) return fishing.camera.position.clone();
  r.updateWorldMatrix(true, false);
  return r.localToWorld(r.userData.tip.clone());
}

// 返普通世界：魚竿斷（小朋友規定）
export function breakRod(fishing, ui) {
  if (state.rod === null || state.rod === undefined) return false;
  state.rod = null;
  if (fishing) cancel(fishing, ui);
  ui?.save?.();
  ui?.popup?.('🎣 Your rod crumbled to dust... buy a new one next time!');
  return true;
}

// 買竿（魚竿舖面板）
export function buyRod(i, ui) {
  const rod = RODS[i];
  if (!rod || state.money < rod.price) return false;
  state.money -= rod.price;
  state.rod = i;
  ui.save();
  ui.play('coin');
  ui.popup(`🎣 You bought the ${rod.name}! Go to the dock and press E to fish.`);
  return true;
}

export { FISH_SPOT };
