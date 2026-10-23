// 🛒 Witch Castle Shop（小朋友 Issue #14：「Add a shop in the Witch's castle so you can buy ranger skins and boss skins」）
// 價錢喺 src/data/castleShop.js；全部用 ☠️ Skele Tokens（state.skeleTokens）
//
// 賣咩：
// - 👹 Demonic Boss Skin（state.demonicBossSkin，用 demonicRewards.js 嘅 unlockDemonicBossSkin）
// - 😈 Demonic Ranger（unlockDemonicSkin）
// - 🔮 Demonic／Eclipse Shard、😈 Demonic Chest（入背包 Gears，可以一次買好多）
// （小朋友 2026-10-23：唔再賣 Meteoric Boss Skin 同普通護林員皮膚）
//   皮膚個樣由 thirdPerson.js 嘅 buildAvatar + applyRangerSkin 畫（其他人改皮膚樣，呢度自動跟）
//
// 用法（hellWorld.js）：
//   createCastleShopPanel({ play, popup, announce, equipRanger })   // extraPanels.castleShop
//   const stall = buildCastleShopStall(parent, x, y, z, ry)           // 3D 攤位 → stall.update(t, quality)

import * as THREE from 'three';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { RANGER_SKINS } from './skins.js';
import { unlockDemonicSkin, unlockDemonicBossSkin } from './demonicRewards.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { CASTLE_BOSS_SKINS, CASTLE_RANGER_PRICES, CASTLE_ITEMS } from './data/castleShop.js';
import { gearInfo, addGear } from './data/gears.js';
import { gearIcon } from './gearArt.js';
import { giveChests } from './chests.js';
import { bulkButtons, bulkCount } from './bulkBuy.js';
import { makeSign, THEMES } from './signs.js';
import { M, GLOW, add, box, cyl, cone, ball, halo, lightPool } from './halloweenArt.js';

const PI = Math.PI;
const $ = (id) => document.getElementById(id);
const tokens = () => state.skeleTokens || 0;

// 賣邊啲護林員皮膚（😈 Demonic 排第一）
export function castleRangerSkins() {
  // 小朋友 2026-10-23：淨係賣 😈 Demonic（Meteoric 同普通皮膚唔喺度賣）
  const list = RANGER_SKINS.filter((s) => CASTLE_RANGER_PRICES[s.id] != null).map((s) => ({ skin: s, cost: CASTLE_RANGER_PRICES[s.id] }));
  return list.sort((a, b) => (b.skin.id === 'demonic') - (a.skin.id === 'demonic') || a.cost - b.cost);
}
const bossOwned = (id) => (id === 'demonic' ? !!state.demonicBossSkin : !!state.meteorBossSkin);


// ======================== 🖼️ 皮膚相（一個 renderer 畫晒，畫完收返）========================
const pics = {};
function renderPics(skins) {
  const need = skins.filter((s) => pics[s.id] === undefined);
  if (!need.length) return;
  let r = null;
  try {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(180, 210, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x553366, 2.3));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(-2, 4, -4);
    scene.add(d);
    const cam = new THREE.PerspectiveCamera(30, 180 / 210, 0.1, 50);
    cam.position.set(-1.7, 2.0, -5.6);
    cam.lookAt(0, 1.3, 0);
    for (const s of need) {
      const a = buildAvatar();
      applyRangerSkin({ avatar: a }, s);
      a.g.rotation.y = 0.45;
      scene.add(a.g);
      r.render(scene, cam);
      pics[s.id] = r.domElement.toDataURL();
      scene.remove(a.g);
      a.g.traverse((o) => o.geometry?.dispose?.());
    }
  } catch {
    for (const s of need) pics[s.id] ??= '';
  } finally {
    if (r) {
      r.dispose();
      r.forceContextLoss();
    }
  }
}

// ======================== 🛒 面板 ========================
const CSS = `
#panel[data-kind="castleShop"] #panel-title { background: linear-gradient(180deg, #8e24aa 0%, #3c0f5c 100%); border-bottom-color: #1d0730; }
.cs-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.cs-top .cs-tokens { background: #1d0b33; color: #fff; border: 2px solid #b388ff; border-radius: 999px; padding: 5px 14px; font-weight: 800; }
.cs-h { margin: 14px 0 8px; color: #4a148c; }
.cs-cards .cs-card { border-color: #9c27b0 !important; background: linear-gradient(180deg, #fbf3ff, #efe0fb); }
.cs-card.cs-rare { border-color: #ff5252 !important; box-shadow: 0 0 16px rgba(255, 82, 82, 0.45); }
.cs-card img { width: 100%; max-width: 130px; height: auto; display: block; margin: 0 auto; filter: drop-shadow(0 4px 6px rgba(74, 20, 140, 0.45)); }
.cs-card .cs-boss { width: 110px; height: 110px; margin: 4px auto; border-radius: 50%; display: grid; place-items: center; font-size: 58px; border: 4px solid #fff3; }
.cs-card .cs-gear { width: 96px; height: 96px; margin: 4px auto; display: grid; place-items: center; font-size: 54px; } .cs-card .cs-gear img { width: 100%; height: 100%; object-fit: contain; }
.cs-card .cs-price { display: block; font-weight: 800; color: #6a1b9a; }
.cs-card p { font-size: 13px; }
`;
function ensureCss() {
  if ($('castle-shop-css')) return;
  const st = document.createElement('style');
  st.id = 'castle-shop-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}
function buyButton(kind, id, cost) {
  const t = tokens();
  return t >= cost
    ? `<button data-cshop="${kind}" data-id="${id}">Buy ☠️ ${cost}</button>`
    : `<button disabled class="grey">Need ${cost - t} more ☠️</button>`;
}
function shopHtml() {
  const rangers = castleRangerSkins();
  renderPics(rangers.map((r) => r.skin));
  const bossBg = { demonic: 'radial-gradient(circle, #ff7043, #8e0000 60%, #2a0000)', meteoric: 'radial-gradient(circle, #80d8ff, #1a237e 60%, #0b1030)' };
  const boss = CASTLE_BOSS_SKINS.map((b) => {
    const owned = bossOwned(b.id);
    return `<div class="card-animal cs-card ${b.id === 'demonic' ? 'cs-rare' : ''} ${owned ? 'equipped' : ''}">
      <div class="cs-boss" style="background:${bossBg[b.id] || bossBg.demonic}">${b.emoji}</div><b>${b.name}</b>
      <span class="cs-price">☠️ ${b.cost}</span><p>${b.text}</p>
      <div class="pet-actions">${owned ? '<span class="tag">✔ Unlocked · press E at a Boss</span>' : buyButton('boss', b.id, b.cost)}</div></div>`;
  }).join('');
  const ranger = rangers.map(({ skin: s, cost }) => {
    const owned = state.ownedRanger?.includes(s.id), wearing = state.rangerSkin === s.id;
    const pic = pics[s.id] ? `<img src="${pics[s.id]}" alt="">` : '<div class="emoji">🧑</div>';
    return `<div class="card-animal cs-card ${s.id === 'demonic' ? 'cs-rare' : ''} ${wearing ? 'equipped' : ''}">${pic}<b>${s.id === 'demonic' ? '😈 ' : ''}${s.name}</b>
      <span class="cs-price">☠️ ${cost}</span>
      <div class="pet-actions">${wearing ? '<span class="tag">✔ Wearing</span>' : owned ? `<button data-cshop="equip" data-id="${s.id}">Wear</button>` : buyButton('ranger', s.id, cost)}</div></div>`;
  }).join('');
  return `<div class="cs-top"><span class="cs-tokens">☠️ ${tokens()} Skele Tokens</span><small>🧙‍♀️ "Spooky styles for brave heroes! Win more tokens in my 🗼 Witch Tower."</small></div>
    <h3 class="cs-h">👹 Boss Skins</h3><p class="hint">Buy once, then walk up to any biome Boss and press <kbd>E</kbd> to change its look.</p>
    <div class="cards cs-cards">${boss}</div>
    <h3 class="cs-h">🧑 Ranger Skins</h3><div class="cards cs-cards">${ranger}</div>
    <h3 class="cs-h">🔮 Shards & 🧰 Chests</h3><p class="hint">They go into your 🎒 Gears. Buy lots at once!</p>
    <div class="cards cs-cards">${CASTLE_ITEMS.map((it) => {
      const g = gearInfo(it.gear);
      const have = (state.gears || []).filter((x) => x.type === it.gear).length;
      return `<div class="card-animal cs-card"><div class="cs-gear">${gearIcon(it.gear) || g.emoji}</div><b>${g.emoji} ${g.name}</b>
        <span class="cs-price">☠️ ${it.cost} each</span><p>${it.text}</p>${have ? `<small>🎒 You have ${have}</small>` : ''}
        ${bulkButtons({ attr: `data-cshop="item" data-id="${it.gear}"`, cost: it.cost, have: tokens(), icon: '☠️' })}</div>`;
    }).join('')}</div>`;
}

export function createCastleShopPanel({ play = () => {}, popup = () => {}, announce = () => {}, equipRanger = () => {} } = {}) {
  ensureCss();
  extraPanels.castleShop = ['🛒 Witch Castle Shop', shopHtml, 'E'];
  const body = $('panel-body');
  body.addEventListener('click', (e) => {
    if ($('panel').dataset.kind !== 'castleShop') return;
    const b = e.target.closest('button[data-cshop]');
    if (!b) return;
    const { cshop: kind, id } = b.dataset;
    const pay = (cost) => {
      if (tokens() < cost) {
        play('wrong');
        popup(`Need ${cost - tokens()} more ☠️ Skele Tokens — win them in the 🗼 Witch Tower!`);
        return false;
      }
      state.skeleTokens = tokens() - cost;
      return true;
    };
    if (kind === 'item') {
      const item = CASTLE_ITEMS.find((x) => x.gear === id);
      const count = item ? bulkCount(b.dataset.n, item.cost, tokens()) : 0;
      if (!count || !pay(item.cost * count)) return;
      const g = gearInfo(id);
      if (g.chest) giveChests(id, count, { quiet: true });
      else addGear(id, count);
      save();
      play('upgrade');
      popup(`+${count} ${g.emoji} ${g.name}${count > 1 ? 's' : ''} added to your 🎒!`);
    } else if (kind === 'boss') {
      const item = CASTLE_BOSS_SKINS.find((x) => x.id === id);
      if (!item || bossOwned(id) || !pay(item.cost)) return;
      if (id === 'demonic') unlockDemonicBossSkin();
      else state.meteorBossSkin = true;
      save();
      play('demonic');
      announce(`${item.emoji} ${item.name} unlocked!`);
      setTimeout(() => popup('Walk up to any biome Boss and press E to change its look!'), 1800);
    } else if (kind === 'ranger') {
      const item = castleRangerSkins().find((x) => x.skin.id === id);
      if (!item || state.ownedRanger?.includes(id) || !pay(item.cost)) return;
      if (id === 'demonic') unlockDemonicSkin({ wear: true });
      else {
        state.ownedRanger = [...(state.ownedRanger || ['ranger']), id];
        state.rangerSkin = id;
        equipRanger(item.skin);
        save();
      }
      play('upgrade');
      announce(`🧑 New skin: ${item.skin.name}!`);
    } else if (kind === 'equip') {
      const skin = RANGER_SKINS.find((s) => s.id === id);
      if (!skin || !state.ownedRanger?.includes(id)) return;
      state.rangerSkin = id;
      equipRanger(skin);
      save();
      play('pop');
      popup(`🧑 Now wearing: ${skin.name}`);
    }
    body.innerHTML = shopHtml();
  });
}

// ======================== 🏪 3D：女巫商店攤位 ========================
// 攤位面向 +z（ry 轉）：木櫃枱 + 紫黑間條帆布 + 女巫帽屋頂、吊燈、藥水瓶、
// 左邊轉緊嘅 😈 Demonic Ranger 公仔、右邊浮住嘅 👹 Boss 面具、櫃枱後面有隻戴禮帽嘅小鬼仔老闆
export function buildCastleShopStall(parent, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const wood = M(0x4a2c22), woodD = M(0x2b1912), purple = M(0x5e1f8a), black = M(0x1a1024);
  const W = 5, D = 2.6;
  // 地台 + 櫃枱
  add(g, box(W + 1, 0.2, D + 1.4), M(0x3a3344), 0, 0.1, 0);
  add(g, box(W, 1.1, 0.9), wood, 0, 0.75, 0.75);
  add(g, box(W + 0.2, 0.12, 1.1), woodD, 0, 1.36, 0.75);
  add(g, box(W - 0.4, 0.75, 0.04), purple, 0, 0.75, 1.22); // 櫃枱前面嘅布
  // 4 支柱 + 間條帆布（斜）
  for (const [px, pz] of [[-W / 2, 1.2], [W / 2, 1.2], [-W / 2, -1.2], [W / 2, -1.2]]) add(g, cyl(0.1, 0.12, 3.4, 6), woodD, px, 1.8, pz);
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    const s = add(g, box(W / stripes + 0.01, 0.06, 2.9), i % 2 ? black : purple, -W / 2 + (i + 0.5) * (W / stripes), 3.65, 0.2);
    s.rotation.x = -0.28;
  }
  for (let i = 0; i < stripes; i++) add(g, cone(0.32, 0.4, 3), i % 2 ? purple : black, -W / 2 + (i + 0.5) * (W / stripes), 3.05, 1.62, false).rotation.set(PI, 0, 0); // 帆布邊
  // 女巫帽屋頂（彎尖）+ 金星
  const hat = new THREE.Group();
  hat.position.set(0, 3.95, -0.1);
  g.add(hat);
  add(hat, cyl(1.7, 1.7, 0.1, 18), black, 0, 0, 0);
  add(hat, cyl(1.0, 1.05, 0.3, 16), GLOW(0x76ff03, 0.8), 0, 0.15, 0);
  add(hat, cone(1.0, 1.9, 16), black, 0, 1.2, 0);
  const tip = add(hat, cone(0.42, 1.0, 12), black, 0.3, 2.35, 0);
  tip.rotation.z = -0.7;
  const star = add(hat, new THREE.OctahedronGeometry(0.22), GLOW(0xffeb3b, 2.4), 0.82, 2.62, 0, false);
  star.userData.keep = true; // 會郁：唔好焊
  halo(hat, 0.82, 2.62, 0, 0.9, 0xffeb3b, 0.4);
  // 吊燈（綠火）
  const lanterns = [];
  for (const s of [-1, 1]) {
    add(g, cyl(0.015, 0.015, 0.5, 4), black, s * 2.1, 3.0, 1.35, false);
    add(g, box(0.32, 0.4, 0.32), black, s * 2.1, 2.6, 1.35);
    const l = add(g, ball(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb2ff59, emissive: 0x76ff03, emissiveIntensity: 2.5 }), s * 2.1, 2.6, 1.35, false);
    l.userData.keep = true; // 會郁：唔好焊
    halo(g, s * 2.1, 2.6, 1.35, 1.2, 0x76ff03, 0.4);
    lanterns.push(l);
  }
  // 櫃枱上嘅藥水瓶 + 一袋 Skele Tokens
  const potion = [0xff4081, 0x76ff03, 0x7c4dff, 0xffab00];
  for (let i = 0; i < 4; i++) {
    const px = -0.6 + i * 0.32;
    add(g, cyl(0.1, 0.12, 0.26, 8), GLOW(potion[i], 1.2), px, 1.55, 0.6, false);
    add(g, cyl(0.04, 0.04, 0.1, 6), M(0xd7ccc8), px, 1.73, 0.6, false);
  }
  add(g, ball(0.26, 10, 8), M(0x6d4c41), 1.2, 1.6, 0.6).scale.set(1, 0.85, 1);
  for (let i = 0; i < 4; i++) add(g, cyl(0.1, 0.1, 0.03, 10), M(0xeceff1, { metalness: 0.5, roughness: 0.3 }), 0.8 + i * 0.05, 1.44 + i * 0.03, 0.85, false); // ☠️ token 疊
  // 後面嘅架：骷髏樽（可愛）+ 書
  add(g, box(W - 0.6, 2.2, 0.3), woodD, 0, 1.3, -1.25);
  for (const yy of [0.9, 1.6, 2.2]) add(g, box(W - 0.8, 0.06, 0.4), wood, 0, yy, -1.1);
  for (let i = 0; i < 8; i++) {
    const c = [0xd500f9, 0x76ff03, 0xff6d00, 0x40c4ff][i % 4];
    add(g, ball(0.14, 8, 6), GLOW(c, 1.1), -1.9 + (i % 4) * 1.25 + (i > 3 ? 0.5 : 0), i > 3 ? 1.78 : 1.08, -1.05, false);
  }
  // 😈 公仔（轉緊）
  const ped = new THREE.Group();
  ped.position.set(-W / 2 - 0.9, 0.2, 0.6);
  g.add(ped);
  add(ped, cyl(0.6, 0.7, 0.35, 10), M(0x2a2733, { metalness: 0.4 }), 0, 0.17, 0);
  add(ped, new THREE.TorusGeometry(0.62, 0.05, 6, 24), GLOW(0xff5252, 1.6), 0, 0.36, 0, false).rotation.x = PI / 2;
  halo(ped, 0, 1.2, 0, 1.8, 0xff3d00, 0.25);
  const doll = new THREE.Group();
  doll.position.y = 0.35;
  doll.scale.setScalar(0.62);
  ped.add(doll);
  try {
    const a = buildAvatar();
    applyRangerSkin({ avatar: a }, RANGER_SKINS.find((s) => s.id === 'demonic') || RANGER_SKINS[0]);
    doll.add(a.g);
  } catch { /* 冇公仔都照開舖 */ }
  // 👹 Boss 面具（浮住轉）
  const mask = new THREE.Group();
  mask.position.set(W / 2 + 0.9, 1.9, 0.6);
  g.add(mask);
  add(mask, cyl(0.5, 0.6, 0.3, 10), M(0x2a2733, { metalness: 0.4 }), 0, -1.55, 0);
  add(mask, box(0.9, 0.8, 0.7), M(0x8e1b1b, { roughness: 0.6 }), 0, 0, 0);
  for (const s of [-1, 1]) {
    add(mask, cone(0.14, 0.6, 6), M(0x1a1010), s * 0.34, 0.6, 0, false).rotation.z = -s * 0.4;
    add(mask, box(0.18, 0.1, 0.05), GLOW(0xffea00, 2.6), s * 0.2, 0.08, -0.36, false);
  }
  add(mask, box(0.5, 0.08, 0.05), M(0x1a1010), 0, -0.2, -0.36, false);
  for (let i = 0; i < 4; i++) add(mask, cone(0.05, 0.12, 4), M(0xfff8e1), -0.15 + i * 0.1, -0.27, -0.37, false).rotation.x = PI;
  halo(mask, 0, 0, 0, 1.4, 0xff3d00, 0.35);
  // 👻 鬼仔老闆（戴禮帽，喺櫃枱後面浮）
  const ghost = new THREE.Group();
  ghost.position.set(0.2, 1.9, -0.2);
  g.add(ghost);
  const gm = new THREE.MeshStandardMaterial({ color: 0xf3e5f5, emissive: 0xce93d8, emissiveIntensity: 0.5, roughness: 0.4, transparent: true, opacity: 0.92 });
  add(ghost, ball(0.45, 16, 12), gm, 0, 0.3, 0, false);
  add(ghost, cyl(0.45, 0.55, 0.5, 14), gm, 0, -0.05, 0, false);
  for (let i = 0; i < 5; i++) add(ghost, cone(0.13, 0.25, 6), gm, Math.cos((i / 5) * PI * 2) * 0.42, -0.4, Math.sin((i / 5) * PI * 2) * 0.42, false).rotation.x = PI;
  for (const s of [-1, 1]) {
    add(ghost, ball(0.08, 8, 6), M(0x1a1024), s * 0.15, 0.38, 0.4, false);
    add(ghost, ball(0.03, 6, 4), GLOW(0xffffff, 1), s * 0.15 + 0.03, 0.41, 0.47, false);
    add(ghost, ball(0.06, 6, 4), M(0xff80ab), s * 0.27, 0.24, 0.36, false);
  }
  add(ghost, new THREE.TorusGeometry(0.08, 0.025, 6, 12, PI), M(0x1a1024), 0, 0.22, 0.43, false).rotation.z = PI;
  add(ghost, cyl(0.42, 0.42, 0.04, 14), black, 0, 0.7, 0);
  add(ghost, cyl(0.26, 0.28, 0.42, 14), black, 0, 0.92, 0);
  add(ghost, cyl(0.285, 0.285, 0.08, 14), GLOW(0xd500f9, 1.2), 0, 0.76, 0, false);
  const arm = add(ghost, ball(0.12, 8, 6), gm, 0.5, 0.05, 0.1, false); // 招手
  arm.userData.keep = true; // 會郁：唔好焊
  // 牌
  const sign = makeSign([{ text: '🛒 CASTLE SHOP', size: 0.36 }, { text: 'Ranger skins & Boss skins for ☠️ Skele Tokens (E)', size: 0.15 }], 4.4, 1.0, THEMES.purple);
  sign.position.set(0, 0.76, 1.27); // 掛喺櫃枱前面
  g.add(sign);
  lightPool(g, 0, 1.2, 4.5, 0xd500f9, 0.3, 0.22);
  const p = new THREE.Vector3();
  g.updateWorldMatrix(true, false);
  g.localToWorld(p.set(0, 0, 2.2));
  return {
    g, pos: { x: p.x, z: p.z },
    update(t) {
      doll.rotation.y = t * 0.8;
      mask.rotation.y = -t * 0.9;
      mask.position.y = 1.9 + Math.sin(t * 1.8) * 0.12;
      ghost.position.y = 1.9 + Math.sin(t * 2.1) * 0.1;
      ghost.rotation.y = Math.sin(t * 0.7) * 0.3;
      arm.position.set(0.5, 0.05 + Math.max(0, Math.sin(t * 5)) * 0.2, 0.1);
      star.rotation.y = t * 2;
      for (const l of lanterns) l.material.emissiveIntensity = 2.2 + Math.sin(t * 9 + l.position.x) * 0.5;
    },
  };
}
