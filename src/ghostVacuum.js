// 🧹 Ghost Vacuum + 👻 Ghost World 嘅鬼魂（小朋友 Issue #6 Halloween）
// 喺 Ghost World 嘅吸塵機舖用 Soul Dust 買／升級（Lv1–5，數值喺 balance.js GHOST_VACUUM）
// 揸住 E（或者滑鼠掣／手機 USE）：前面一條吸塵光柱，光柱入面嘅鬼慢慢縮細俾你吸入去 → 得 Soul Dust
// 強啲嘅鬼要吸耐啲，仲會發光之後掟慢慢飛嘅光球（好易閃）；中咗會跌少少 Soul Dust
// 吸塵機淨係喺 Halloween 世界先見到（唔入普通世界嘅背包）

import * as THREE from 'three';
import { state, save } from './state.js';
import { GHOST_VACUUM, GHOST_MAX_SOULS, SOUL_ORB_HIT_DUST } from './data/balance.js';
import { buildSoul, randomSoulType, rollSoulDust, launchSoulOrb } from './halloweenSouls.js';
import { GHOST_WORLD, GHOST_SPAWN_R, STATUE_OF_HALLOWEEN, VACUUM_SHOP, GHOST_TRAIN_STOP, inHalloween, inGhostWorld } from './halloweenShape.js';
import { extraPanels, openPanel, panelKind } from './hud.js';
import { short } from './format.js';
import { THEMES } from './signs.js';
import { beacon, glowSign } from './hwBeacons.js';

const $ = (id) => document.getElementById(id);
const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();

export const vacuumInfo = (level = state.vacuumLevel) => GHOST_VACUUM[Math.max(1, level) - 1];

// ---------- 吸塵機模型（每級一個色；Lv5 金色 + 發光嘅鬼魂缸）----------
export function buildVacuumModel(level) {
  const info = GHOST_VACUUM[Math.max(1, level) - 1];
  const g = new THREE.Group();
  const gold = level >= 5;
  const body = new THREE.MeshStandardMaterial({ color: gold ? 0xffc107 : info.color, metalness: gold ? 0.9 : 0.4, roughness: gold ? 0.25 : 0.45, emissive: level >= 2 ? info.color : 0x000000, emissiveIntensity: level >= 2 ? 0.18 : 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // 缸（鬼魂吸入去會喺度轉）
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 14), body, 0, 0, 0.15).rotation.x = Math.PI / 2;
  const tank = add(new THREE.SphereGeometry(0.16, 12, 10), glowMat, 0, 0.22, 0.15);
  add(new THREE.TorusGeometry(0.22, 0.03, 6, 16), dark, 0, 0, -0.12);
  // 槍管 + 闊嘴
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), dark, 0, 0, -0.45).rotation.x = Math.PI / 2;
  const nozzle = add(new THREE.CylinderGeometry(0.16, 0.09, 0.22, 14, 1, true), body, 0, 0, -0.85);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.material = body.clone();
  nozzle.material.side = THREE.DoubleSide;
  const mouth = add(new THREE.RingGeometry(0.06, 0.15, 16), glowMat, 0, 0, -0.96);
  mouth.rotation.y = Math.PI;
  // 手柄
  add(new THREE.BoxGeometry(0.08, 0.26, 0.1), dark, 0, -0.2, 0.05);
  // 高級：兩邊有鰭 / 金色尖角
  if (level >= 3) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.18, 0.3), glowMat, s * 0.24, 0.06, 0.15);
  if (level >= 4) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.2, 6), glowMat, s * 0.12, 0.26, -0.1);
  if (gold) add(new THREE.TorusGeometry(0.28, 0.025, 6, 20), glowMat, 0, 0, 0.42);
  g.userData = {
    level,
    animate(t, sucking) {
      tank.scale.setScalar(1 + Math.sin(t * (sucking ? 18 : 3)) * (sucking ? 0.15 : 0.05));
      glowMat.emissiveIntensity = sucking ? 3 : 1.6 + Math.sin(t * 2) * 0.3;
      mouth.rotation.z = t * (sucking ? 12 : 1);
    },
  };
  return g;
}

// ---------- 吸塵機舖面板 ----------
function shopHtml() {
  const lv = state.vacuumLevel;
  const rows = GHOST_VACUUM.map((v, i) => {
    const n = i + 1;
    const owned = lv >= n;
    const next = n === lv + 1;
    const can = state.soulDust >= v.cost;
    const btn = owned ? '<span class="owned">✔ Owned</span>'
      : next ? `<button data-hw="buyVac" data-lv="${n}" class="${can ? '' : 'grey'}">${n === 1 ? (v.cost ? `Get it (${short(v.cost)} 💀)` : 'Get it FREE!') : `Upgrade (${short(v.cost)} 💀)`}</button>`
        : '<span class="locked">🔒</span>';
    return `<div class="card-animal ${owned ? 'equipped' : ''}" style="border-color:#${v.color.toString(16).padStart(6, '0')}">
      <div class="emoji">🧹</div><b>Lv ${n} · ${v.name}</b>
      <small>⚡ Speed x${v.power} · 📏 ${v.range} m reach · 🔦 ${v.cone}° beam</small>
      ${btn}</div>`;
  }).join('');
  return `<p class="index-summary">💀 Soul Dust: <b>${short(state.soulDust)}</b> · 🧹 Your vacuum: <b>${lv ? `Lv ${lv} ${vacuumInfo().name}` : 'none yet'}</b></p>
    <p class="hint">Hold <kbd>E</kbd> (or the mouse button / USE) to suck up ghosts. A better vacuum catches them faster and from further away!</p>
    <div class="cards">${rows}</div>`;
}
extraPanels.vacuum = ['🧹 Ghost Vacuum Shop', shopHtml, 'E'];

// ---------- 主體 ----------
export function createGhostHunt({ scene, camera, avatar, isFirstPerson, isBlocked, popup, announce, play, flash, knockback }) {
  // 拎喺手：第一身掛鏡頭；第三身掛公仔右手
  let handModel = null;
  let avatarModel = null;
  function refreshModels() {
    handModel?.removeFromParent();
    avatarModel?.removeFromParent();
    handModel = avatarModel = null;
    if (!state.vacuumLevel) return;
    handModel = buildVacuumModel(state.vacuumLevel);
    handModel.position.set(0.42, -0.4, -0.75);
    handModel.scale.setScalar(0.9);
    camera.add(handModel);
    avatarModel = buildVacuumModel(state.vacuumLevel);
    avatarModel.position.set(0.05, -0.75, -0.35);
    // 手垂直落地，槍管照向前（-z）
    avatarModel.scale.setScalar(1.6);
    avatar.arms[1].add(avatarModel);
  }
  refreshModels();
  // 吸塵機舖：發光大牌 + 燈 + 指路圈（遠遠都見到）
  const shopBeacon = beacon(scene, VACUUM_SHOP.x, VACUUM_SHOP.z + 3, { color: 0x40c4ff, radius: 1.6 });
  const shopSign = glowSign([{ text: '🧹 GHOST VACUUM SHOP', size: 0.4 }, { text: 'Get & upgrade your vacuum · press E', size: 0.2 }], 5.4, 1.4, THEMES.blue);
  shopSign.position.set(VACUUM_SHOP.x, 6.6, VACUUM_SHOP.z + 1.8);
  scene.add(shopSign);

  // 吸塵光柱（世界座標，每格跟住鏡頭）
  const beam = new THREE.Group();
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xb2ff59, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), coneMat);
  cone.rotation.x = Math.PI / 2; // 尖嗰頭喺吸塵機嘴（beam 嘅 +z），開口向遠處
  beam.add(cone);
  const PN = 60;
  const pPos = new Float32Array(PN * 3);
  const pSeed = Array.from({ length: PN }, () => [Math.random(), Math.random() * Math.PI * 2, Math.random()]);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xe0ffff, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  parts.frustumCulled = false;
  beam.add(parts);
  beam.visible = false;
  scene.add(beam);

  // 捉到鬼嘅爆閃
  const bursts = [];
  function burst(at, color) {
    const N = 26;
    const pos = new Float32Array(N * 3);
    const vel = Array.from({ length: N }, () => new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.25, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.position.copy(at);
    pts.frustumCulled = false;
    scene.add(pts);
    bursts.push({ pts, pos, vel, geo, t: 0 });
  }

  // HUD：Soul Dust + Shard
  const hud = document.createElement('div');
  hud.id = 'hw-dust-hud';
  hud.className = 'hud-box';
  hud.hidden = true;
  document.body.appendChild(hud);

  // ---- 輸入：揸住 E／滑鼠左掣／手機 USE ----
  const hold = { key: false, mouse: false, touch: false };
  window.addEventListener('keydown', (e) => e.code === 'KeyE' && (hold.key = true));
  window.addEventListener('keyup', (e) => e.code === 'KeyE' && (hold.key = false));
  window.addEventListener('mousedown', (e) => e.button === 0 && (hold.mouse = true));
  window.addEventListener('mouseup', (e) => e.button === 0 && (hold.mouse = false));
  window.addEventListener('blur', () => (hold.key = hold.mouse = hold.touch = false));
  let touchHooked = false;
  function hookTouch() {
    const b = $('t-use');
    if (!b || touchHooked) return;
    touchHooked = true;
    b.addEventListener('touchstart', () => (hold.touch = true), { passive: true });
    b.addEventListener('touchend', () => (hold.touch = false), { passive: true });
    b.addEventListener('touchcancel', () => (hold.touch = false), { passive: true });
  }

  // 近住呢啲嘢嘅時候撳 E 係用嗰樣嘢，唔係吸塵
  const nearThing = (p) => [STATUE_OF_HALLOWEEN, VACUUM_SHOP, GHOST_TRAIN_STOP].some((o) => Math.hypot(p.x - o.x, p.z - o.z) < 5.5);

  // ---- 鬼魂 ----
  const souls = [];
  const orbs = [];
  function spawnSoul(playerPos) {
    const type = randomSoulType();
    let x;
    let z;
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * (GHOST_SPAWN_R - 14);
      x = GHOST_WORLD.x + Math.cos(a) * r;
      z = GHOST_WORLD.z + Math.sin(a) * r;
      if (Math.hypot(x - playerPos.x, z - playerPos.z) > 10 && Math.hypot(x - GHOST_TRAIN_STOP.x, z - GHOST_TRAIN_STOP.z) > 8) break;
    }
    const g = buildSoul(type.id);
    g.position.set(x, 0.8 + Math.random() * 1.6, z);
    g.scale.setScalar(0.01); // 慢慢出現
    scene.add(g);
    souls.push({ g, type, p: 0, target: new THREE.Vector3(x, g.position.y, z), wait: 0, attack: type.attackEvery ? type.attackEvery * (0.6 + Math.random()) : 0, charge: 0, appear: 0 });
  }
  function clearAll() {
    for (const s of souls) scene.remove(s.g);
    souls.length = 0;
    for (const o of orbs) o.dispose();
    orbs.length = 0;
  }

  let soundT = 0;
  let wasGhost = false;
  let sucking = false;

  function update(dt, t, { pos, feetY, paused }) {
    hookTouch();
    const inside = inHalloween(pos.x, pos.z);
    const ghost = inGhostWorld(pos.x, pos.z);
    // 吸塵機：喺 Halloween 世界先見到
    const fp = isFirstPerson();
    if (handModel) handModel.visible = inside && fp && !paused;
    if (avatarModel) avatarModel.visible = inside;
    // HUD
    const panelOpen = !$('panel').hidden;
    hud.hidden = !inside || panelOpen;
    if (inside && !panelOpen) {
      const text = `💀 Soul Dust: ${short(state.soulDust)} · 🔮 Shards: ${state.hwShards}${state.vacuumLevel ? ` · 🧹 Lv ${state.vacuumLevel}` : ''}`;
      if (hud.textContent !== text) hud.textContent = text;
    }
    if (ghost) shopBeacon.update(t);
    // 離開 Ghost World：清晒啲鬼
    if (!ghost) {
      if (wasGhost) clearAll();
      wasGhost = false;
      beam.visible = false;
      sucking = false;
      return;
    }
    wasGhost = true;
    if (paused) {
      beam.visible = false;
      return;
    }
    while (souls.length < GHOST_MAX_SOULS) spawnSoul(pos);

    // ---- 吸緊？ ----
    const holding = hold.key || hold.mouse || hold.touch;
    sucking = holding && state.vacuumLevel > 0 && !isBlocked() && !nearThing(pos);
    if (holding && !state.vacuumLevel && !nearThing(pos) && !isBlocked() && Math.random() < dt * 2) popup('🧹 Get a Ghost Vacuum at the Vacuum Shop first! (near the train)');
    const info = vacuumInfo();
    camera.getWorldDirection(fwd);
    fwd.y = Math.max(-0.35, Math.min(0.35, fwd.y));
    fwd.normalize();
    const mouthPos = tmp.set(pos.x, (feetY ?? 0) + 1.2, pos.z).addScaledVector(fwd, 0.8).clone();
    beam.visible = sucking;
    if (sucking) {
      const rad = Math.tan(THREE.MathUtils.degToRad(info.cone / 2)) * info.range;
      beam.position.copy(mouthPos).addScaledVector(fwd, info.range / 2);
      beam.lookAt(mouthPos);
      cone.scale.set(rad, info.range, rad);
      coneMat.color.setHex(info.color);
      coneMat.opacity = 0.2 + Math.sin(t * 20) * 0.06;
      parts.material.color.setHex(info.color).lerp(new THREE.Color(0xffffff), 0.6);
      // 粒子由遠處吸返嚟嘴度（beam 座標：+z 指住嘴；光柱中心喺 0）
      pSeed.forEach((s, i) => {
        const k = (s[0] + t * 1.6) % 1;
        const along = info.range / 2 - k * info.range; // 由遠（-range/2）去近（+range/2）
        const rr = rad * (1 - k) * s[2];
        pPos[i * 3] = Math.cos(s[1] + t * 4) * rr;
        pPos[i * 3 + 1] = Math.sin(s[1] + t * 4) * rr;
        pPos[i * 3 + 2] = -along;
      });
      pGeo.attributes.position.needsUpdate = true;
      soundT -= dt;
      if (soundT <= 0) {
        soundT = 0.25;
        play('vacuum');
      }
    }
    if (handModel) handModel.userData.animate(t, sucking);
    if (avatarModel) avatarModel.userData.animate(t, sucking);

    // ---- 每隻鬼 ----
    for (let i = souls.length - 1; i >= 0; i--) {
      const s = souls[i];
      const g = s.g;
      s.appear = Math.min(1, s.appear + dt * 1.5);
      const d = tmp.copy(g.position).sub(mouthPos);
      const dist = d.length();
      const inBeam = sucking && dist < info.range && d.normalize().dot(fwd) > Math.cos(THREE.MathUtils.degToRad(info.cone / 2));
      if (inBeam) {
        s.p += (dt * info.power) / s.type.catchSeconds;
        g.position.lerp(mouthPos, Math.min(1, dt * 0.6 * info.power * (0.4 + s.p))); // 慢慢拉埋嚟
      } else {
        s.p = Math.max(0, s.p - dt * 0.35); // 走甩咗：慢慢回復
        // 周圍飄
        s.wait -= dt;
        if (s.wait <= 0) {
          s.wait = 2 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2;
          const r = 8 + Math.random() * (GHOST_SPAWN_R - 10);
          s.target.set(GHOST_WORLD.x + Math.cos(a) * r, 0.8 + Math.random() * 1.8, GHOST_WORLD.z + Math.sin(a) * r);
        }
        g.position.lerp(s.target, Math.min(1, dt * 0.25));
      }
      g.scale.setScalar(s.appear);
      g.userData.suck(s.p);
      g.userData.update(t);
      if (s.p >= 1) {
        // 捉到！
        const dust = rollSoulDust(s.type);
        state.soulDust += dust;
        save();
        burst(g.position, s.type.color);
        play('soulCatch');
        popup(`👻 Caught a ${s.type.name}! +${short(dust)} 💀 Soul Dust`);
        scene.remove(g);
        souls.splice(i, 1);
        continue;
      }
      // 攻擊：發光（預告）→ 掟一粒慢慢飛嘅光球去你企嘅位
      if (s.type.attackEvery && !inBeam) {
        const near = Math.hypot(g.position.x - pos.x, g.position.z - pos.z) < 26;
        s.attack -= dt;
        if (near && s.attack <= 0.9 && s.attack > 0) g.userData.charge(1 - s.attack / 0.9);
        else g.userData.charge(0);
        if (s.attack <= 0) {
          s.attack = s.type.attackEvery * (0.8 + Math.random() * 0.5);
          if (near) orbs.push(launchSoulOrb(scene, g.position.clone(), new THREE.Vector3(pos.x, (feetY ?? 0) + 1.1, pos.z), s.type.color));
        }
      } else g.userData.charge(0);
    }

    // ---- 光球 ----
    const chest = new THREE.Vector3(pos.x, (feetY ?? 0) + 1.1, pos.z);
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      const r = o.update(dt);
      if (r === 'done') {
        orbs.splice(i, 1);
        continue;
      }
      if (o.flying && o.position.distanceTo(chest) < o.radius + 0.55) {
        o.dispose();
        orbs.splice(i, 1);
        const lost = Math.min(state.soulDust, SOUL_ORB_HIT_DUST);
        state.soulDust -= lost;
        save();
        play('ouch');
        flash();
        knockback(tmp.copy(chest).sub(o.position).setY(0).normalize());
        popup(lost ? `💥 A soul orb hit you! -${lost} 💀 Soul Dust` : '💥 A soul orb hit you! Dodge them!');
      }
    }

    // ---- 爆閃 ----
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      b.vel.forEach((v, k) => {
        v.y -= 6 * dt;
        b.pos[k * 3] += v.x * dt;
        b.pos[k * 3 + 1] += v.y * dt;
        b.pos[k * 3 + 2] += v.z * dt;
      });
      b.geo.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / 1.2);
      if (b.t > 1.2) {
        scene.remove(b.pts);
        bursts.splice(i, 1);
      }
    }
  }

  // 吸塵機舖
  function interaction(pos) {
    if (!inGhostWorld(pos.x, pos.z)) return null;
    if (Math.hypot(pos.x - VACUUM_SHOP.x, pos.z - VACUUM_SHOP.z - 2) < 5) return { prompt: `<kbd>E</kbd> 🧹 Ghost Vacuum Shop${state.vacuumLevel ? ` (you have Lv ${state.vacuumLevel})` : ' - get your vacuum here!'}`, action: () => openPanel('vacuum') };
    return null;
  }
  function buy(level) {
    const v = GHOST_VACUUM[level - 1];
    if (!v || level !== state.vacuumLevel + 1) return;
    if (state.soulDust < v.cost) return popup(`💀 You need ${short(v.cost - state.soulDust)} more Soul Dust! Catch more ghosts.`);
    state.soulDust -= v.cost;
    state.vacuumLevel = level;
    save();
    refreshModels();
    play('upgrade');
    announce(`🧹 You got the Lv ${level} ${v.name}!`);
  }
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hw="buyVac"]');
    if (!b || panelKind() !== 'vacuum') return;
    buy(Number(b.dataset.lv));
    $('panel-body').innerHTML = shopHtml();
  });

  return { update, interaction, buy, souls, orbs, hold, get sucking() { return sucking; }, refreshModels, clearAll };
}
