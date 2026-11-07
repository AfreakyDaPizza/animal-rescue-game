// 🐎 騎寵物 + 🪢 Leash（小朋友 Issue #16）
//
// 🐎 騎：用過 🐎 Ridable Shard 嘅寵物（pet.rideable = true，有馬鞍）可以騎
//   - 有可以騎嘅寵物 → 快捷欄第 1 格變「🐎 Ride」（hud.js RIDE_ITEM；原本第 1 格嘅嘢自動搬去下一個空格）
//   - 撳 1（或者撳嗰格）：未揀坐騎 → 彈個細面板揀；揀咗 → 上／落坐騎；揀咗嗰格再撳 E = 換第二隻
//   - state.ridePet = 坐騎喺 state.pets 嘅 index（賣咗前面嘅寵物 index 會郁，呢度每格會自己執返）
//   - 騎緊：隻寵物喺你腳下（第三身見到你坐喺馬鞍上面；第一身對眼高啲），行路用佢自己嘅行／跑動畫
//   - 速度：寵物 $/秒 越多越快 → ×min(RIDE_SPEED_MAX, 1 + RIDE_SPEED_PER_LOG10 × log10($/秒))（數值喺 data/tame.js）
//     用 moveOpts.rideMul（同 🗼 女巫塔 Frost 嘅 moveOpts.speedMul 相乘，唔會撞）
//   - 自動落坐騎：Boss Arena、女巫塔、Reaper 大廳、Catch & Tame（window.__rodeo.active）、播片、彈飛、坐低、
//     訓練機／Gym、雙手抱住動物（借動物 → 落坐騎 + 提示）。其他檔案可以叫 window.__riding.dismount()
//
// 🪢 Leash（gear 'leash'，唔會用完）：快捷欄揀咗佢，喺生態區行近野生動物撳 E → 條繩拖住佢跟住你行
//   - 用返「抱住動物」嗰套（rescue.carrying，加 leashed: true）：返到 Hub = 救援成功、Boss 照追、答錯問題／入夜照走甩
//   - 條繩：由你隻手去隻動物條頸，中間吊低少少（距離近 = 吊得低）
//
// main.js 用法：
//   const riding = createRiding({ scene, camera, player, thirdPerson, rescue, togglePanel, ... })
//   每格：riding.update(dt, time, { blocked, frozen })（updateThirdPerson 之前）；riding.afterView(view)（之後）
//   1 掣：riding.press()；E（揀咗 Leash）：riding.leashPrompt(w)

import * as THREE from 'three';
import { state, save } from './state.js';
import { findAnimal, itemMoney, kgScale, mutationList } from './data/animals.js';
import { RIDE_SPEED_PER_LOG10, RIDE_SPEED_MAX } from './data/tame.js';
import { buildAnimalModel } from './animalModels.js';
import { applyPetSkin, activePetSkin } from './skins.js';
import { addFireAura } from './fireAura.js';
import { addSaddle } from './saddle.js';
import { groundAt } from './world.js';
import { moveOpts } from './player.js';
import { toolFlags, hotbarItems, hotbarHooks, extraPanels, panelKind, popup, announce, renderHotbar } from './hud.js';
import { petPic } from './animalPics.js';
import { short as fmt } from './format.js';
import { play } from './sound.js';

// 🎮 數字（可以自己改）
const SEAT_MIN = 0.9; // 坐騎馬鞍最矮幾高（米）：細隻寵物會放大到呢個高度
const SEAT_MAX = 2.4; // 最高幾高：大隻寵物（大象、鯨魚）縮細到呢個高度，唔會遮晒個畫面
const LEASH_GAP = 1.6; // 🪢 隻動物喺你後面幾遠（再加佢自己嘅大細）

export const rideSpeedMult = (pet) => Math.min(RIDE_SPEED_MAX, 1 + RIDE_SPEED_PER_LOG10 * Math.log10(Math.max(1, itemMoney(pet))));
export const rideablePets = () => (state.pets || []).filter((p) => p?.rideable);

const $ = (id) => document.getElementById(id);
const V = () => new THREE.Vector3();

export function createRiding(ctx) {
  const { scene, camera, player, thirdPerson, rescue } = ctx;
  let mount = null; // { pet, wrap, inner, seat（腳底到馬鞍面幾高）, size, mult }
  let ridePetRef = null; // 揀咗嘅寵物（object；state.ridePet 只係 index）
  let lastHas = false;

  // ---- 揀咗邊隻：state.ridePet（index）↔ object ----
  function chosen() {
    if (ridePetRef && state.pets.includes(ridePetRef) && ridePetRef.rideable) {
      const i = state.pets.indexOf(ridePetRef);
      if (state.ridePet !== i) state.ridePet = i; // 賣咗前面嘅寵物：index 郁咗，執返
      return ridePetRef;
    }
    const p = Number.isInteger(state.ridePet) ? state.pets[state.ridePet] : null;
    ridePetRef = p?.rideable ? p : null;
    if (!ridePetRef && state.ridePet != null) state.ridePet = null;
    return ridePetRef;
  }

  // ---- 快捷欄：有坐騎 → 第 1 格係 Ride（原本放喺第 1 格嘅嘢搬去下一個空格）----
  function syncHotbar() {
    const has = rideablePets().length > 0;
    toolFlags.ride = has;
    if (has && state.hotbar?.[0]) {
      const hb = state.hotbar;
      const j = hb.findIndex((k, i) => i > 0 && !k);
      if (j > 0) hb[j] = hb[0];
      hb[0] = null;
      save();
    }
    if (has && !lastHas) renderHotbar();
    lastHas = has;
  }

  // ---- 坐騎模型 ----
  function buildMount(pet) {
    const animal = findAnimal(pet.name);
    if (!animal) return null;
    const inner = buildAnimalModel(animal);
    applyPetSkin(inner, activePetSkin());
    inner.userData.flying = false; // 雀仔都喺地上行（揹住你）
    inner.scale.multiplyScalar(kgScale(pet));
    const got = addSaddle(inner);
    if (!got) return null;
    // 量馬鞍喺邊（model 自己座標 × 縮放）
    const saddle = got.saddle;
    const k0 = inner.scale.x;
    const seat0 = got.seatY * k0;
    const k = THREE.MathUtils.clamp(seat0, SEAT_MIN, SEAT_MAX) / Math.max(0.05, seat0);
    inner.scale.multiplyScalar(k);
    const kk = inner.scale.x;
    inner.position.set(-saddle.position.x * kk, 0, -saddle.position.z * kk); // 馬鞍喺正中（你坐喺度）
    for (const m of mutationList(pet)) addFireAura(inner, m);
    const wrap = new THREE.Group();
    wrap.add(inner);
    wrap.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    const box = new THREE.Box3().setFromObject(wrap);
    const size = box.getSize(V());
    return { pet, wrap, inner, seat: got.seatY * kk, size: Math.max(size.x, size.z, size.y), mult: rideSpeedMult(pet), phase: 0 };
  }

  function mountPet(pet, { quiet = false } = {}) {
    if (!pet?.rideable) return;
    if (ctx.blocked?.()) return popup("🐎 You can't ride here!");
    if (rescue.carrying && !rescue.carrying.leashed) return popup('🙌 Your hands are full - take your animal to the Hub first, then ride!');
    dismount({ quiet: true });
    ridePetRef = pet;
    state.ridePet = state.pets.indexOf(pet);
    save();
    mount = buildMount(pet);
    if (!mount) return popup('🐎 This pet cannot be ridden, sorry!');
    scene.add(mount.wrap);
    moveOpts.rideMul = mount.mult;
    moveOpts.rideLift = Math.max(0, mount.seat - 0.3); // 對眼：馬鞍 + 1.3 米（企喺地上係 1.6 米）
    placeMount(0);
    if (!quiet) {
      play('boing');
      setTimeout(() => play('ding'), 120);
      announce(`🐎 Riding ${pet.name}! Speed x${mount.mult.toFixed(2)}`);
    }
    renderHotbar();
  }

  // 落坐騎（其他檔案都可以叫：window.__riding.dismount()）
  function dismount({ quiet = false, reason = '' } = {}) {
    if (!mount) return false;
    mount.wrap.removeFromParent();
    mount = null;
    moveOpts.rideMul = 1;
    moveOpts.rideLift = 0;
    if (reason) popup(reason);
    else if (!quiet) popup('🐎 You hopped off!');
    if (!quiet) play('pop');
    renderHotbar();
    return true;
  }

  // 撳 1／Ride 格
  function press() {
    syncHotbar();
    if (!toolFlags.ride) return;
    if (mount) return dismount();
    const pet = chosen();
    if (pet) return mountPet(pet);
    openPicker();
  }
  function openPicker() {
    if (panelKind() !== 'ride') ctx.togglePanel('ride');
  }

  // ---- 揀坐騎面板 ----
  function pickerHtml() {
    const list = rideablePets().sort((a, b) => itemMoney(b) - itemMoney(a));
    const cur = chosen();
    if (!list.length) return '<p class="index-summary">No ridable pets yet! Use a 🐎 Ridable Shard on a pet first (⭐ Special\'s Stall).</p>';
    return `<p class="index-summary">🐎 Pick a pet to ride! The more 💰 money per second it makes, the FASTER you go (max x${RIDE_SPEED_MAX}).<br><small>Press <b>1</b> to hop on / hop off.</small></p>
      <div class="cards">${list.map((p) => `<div class="card-animal ${p === cur ? 'equipped' : ''}">
        ${petPic(p.name, { rarity: p.rarity })}<b>${p.name}</b>
        <span class="kg">💰 $${fmt(itemMoney(p))}/s · ⚡ x${rideSpeedMult(p).toFixed(2)} speed</span>
        <div class="card-buttons"><button data-ride="${state.pets.indexOf(p)}">${mount?.pet === p ? '✔ Riding' : '🐎 Ride!'}</button></div>
      </div>`).join('')}</div>`;
  }
  extraPanels.ride = ['🐎 Pick a Ride', pickerHtml, '1'];
  $('panel-body')?.addEventListener('click', (e) => {
    if (panelKind() !== 'ride') return;
    const b = e.target.closest('button[data-ride]');
    if (!b) return;
    const pet = state.pets[Number(b.dataset.ride)];
    if (!pet?.rideable) return;
    ctx.togglePanel('ride');
    if (mount?.pet === pet) return;
    ridePetRef = pet;
    state.ridePet = state.pets.indexOf(pet);
    save();
    mountPet(pet);
  });

  // ---- 每格 ----
  const _fwd = V();
  function placeMount(dt) {
    const w = mount.wrap;
    w.position.set(camera.position.x, player.feetY, camera.position.z);
    // 轉身：跟住鏡頭方向（慢少少，似真啲）
    const yaw = thirdPerson.bodyYaw ?? camera.rotation.y; // 🔓 Shift Lock 熄咗：跟公仔面向（行緊嘅方向）
    let d = yaw - w.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    w.rotation.y += dt ? d * Math.min(1, dt * 12) : d;
  }

  function update(dt, time, { frozen = false } = {}) {
    syncHotbar();
    if (mount) {
      // 揀咗嗰隻冇咗（賣咗）／唔再可以騎
      if (!state.pets.includes(mount.pet) || !mount.pet.rideable) dismount({ quiet: true });
      else if (rescue.carrying && !rescue.carrying.leashed) dismount({ reason: `🙌 You hopped off to carry the ${rescue.carrying.animal.name}!` });
      else if (ctx.blocked?.()) dismount({ quiet: true });
    }
    if (mount) {
      placeMount(dt);
      // 行路／跑步動畫（跑得越快郁得越勁）
      const moving = player.walking ? 1 : 0;
      if (!frozen) mount.inner.userData.animate?.(time * (moving ? 1.25 : 1), moving);
      // 跳起：成隻跟住你（wrap 喺你腳底），落地彈一彈
      mount.inner.position.y = player.grounded && moving ? Math.abs(Math.sin(time * 9)) * 0.06 * mount.seat : 0;
      moveOpts.rideMul = mount.mult;
    }
    updateLeash(dt, time, frozen);
  }

  // 第三身：公仔坐喺馬鞍上面（擘開腳、雙手向前拉住韁繩）+ 鏡頭退後啲；要喺 updateThirdPerson 之後
  function afterView(view) {
    const av = thirdPerson.avatar;
    if (!mount || !av.g.visible) return;
    const [L, R] = av.legs;
    const [AL, AR] = av.arms;
    av.g.position.y = player.feetY + mount.seat + mount.inner.position.y - 0.82; // 屁股（髖 0.9）坐喺馬鞍面
    av.g.rotation.x = 0;
    L.rotation.set(1.0, 0, -0.42);
    R.rotation.set(1.0, 0, 0.42);
    if (!thirdPerson.held) {
      const k = player.walking ? Math.sin(time() * 9) * 0.08 : 0;
      AL.rotation.set(0.95 + k, 0, -0.12);
      AR.rotation.set(0.95 - k, 0, 0.12);
    }
    if (view && view !== camera) {
      camera.getWorldDirection(_fwd);
      const extra = Math.min(6, mount.size * 0.45);
      view.position.addScaledVector(_fwd, -extra);
      view.position.y += extra * 0.25;
    }
  }
  const time = () => performance.now() / 1000;

  // ================= 🪢 Leash =================
  let rope = null; // { mesh, mat }
  const _a = V();
  const _b = V();
  const _pts = Array.from({ length: 9 }, () => V());
  function ropeMesh() {
    if (rope) return rope;
    const mat = new THREE.MeshStandardMaterial({ color: 0xd7a86e, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    rope = { mesh, mat };
    return rope;
  }

  // E：用條繩拖住野生動物 w（同「借」一樣嘅效果，不過佢自己跟住你行）
  function leash(w) {
    if (rescue.carrying) return false;
    rescue.wild = rescue.wild.filter((x) => x !== w);
    // 收埋光圈、光柱、名牌（佢而家係你嘅朋友，唔使再搵）
    for (const ch of w.group.children) if (ch !== w.model) ch.visible = false;
    const box = new THREE.Box3().setFromObject(w.model);
    const size = box.getSize(V());
    // 條頸（隻動物自己座標）：前面、高高地
    const neck = w.model.worldToLocal(V().set((box.min.x + box.max.x) / 2, box.min.y + size.y * 0.72, box.min.z + size.z * 0.18));
    rescue.carrying = { animal: w.animal, kg: w.kg, rarity: w.rarity, seed: w.seed, sizeMul: w.sizeMul, mutation: w.mutation, model: w.group, leashed: true, leashModel: w.model, neck, gap: LEASH_GAP + Math.max(size.x, size.z) * 0.5 };
    const r = ropeMesh();
    scene.add(r.mesh);
    return true;
  }

  // 手（拎住條繩嗰度）喺世界邊度
  function handPos(out) {
    const av = thirdPerson.avatar;
    if (av.g.visible) {
      av.g.updateMatrixWorld(true);
      return av.arms[1].localToWorld(out.set(0, -0.85, 0));
    }
    camera.getWorldDirection(_fwd);
    out.copy(camera.position).addScaledVector(_fwd, 0.6);
    out.y -= 0.55;
    out.x += -_fwd.z * 0.3; // 右手
    out.z += _fwd.x * 0.3;
    return out;
  }

  function updateLeash(dt, t, frozen) {
    const c = rescue.carrying;
    if (!c?.leashed) {
      if (rope?.mesh.parent) rope.mesh.removeFromParent();
      return;
    }
    const g = c.model;
    const p = camera.position;
    const dx = p.x - g.position.x;
    const dz = p.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const gap = c.gap + (mount ? mount.size * 0.35 : 0);
    let moving = 0;
    if (dist > 45) {
      // 傳送咗／彈飛：即刻跟返嚟（喺你後面）
      camera.getWorldDirection(_fwd);
      g.position.set(p.x - _fwd.x * gap, player.feetY, p.z - _fwd.z * gap);
    } else if (!frozen && dist > gap) {
      const step = Math.min(dist - gap, Math.max(4, (dist - gap) * 6) * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      moving = Math.min(1, (dist - gap) * 2);
    }
    if (dist > 0.01) c.leashModel.rotation.y = Math.atan2(dx, dz) + Math.PI; // 面向你（動物面向 -z）
    // 地面高度：跟你嘅高度（例如落山）
    const gy = groundAt(g.position.x, g.position.z, Math.max(player.feetY, g.position.y) + 0.6);
    g.position.y += (gy - g.position.y) * Math.min(1, dt * 10);
    if (!frozen) c.leashModel.userData.animate?.(t, moving);
    // 條繩：手 → 條頸，中間吊低
    handPos(_a);
    c.leashModel.updateWorldMatrix(true, false);
    _b.copy(c.neck).applyMatrix4(c.leashModel.matrixWorld);
    const len = _a.distanceTo(_b);
    const sag = Math.max(0.05, (gap + 1.2 - len) * 0.45) + 0.1;
    for (let i = 0; i < _pts.length; i++) {
      const u = i / (_pts.length - 1);
      _pts[i].lerpVectors(_a, _b, u);
      _pts[i].y -= sag * 4 * u * (1 - u);
    }
    const r = ropeMesh();
    if (!r.mesh.parent) scene.add(r.mesh);
    r.mesh.geometry.dispose();
    r.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(_pts), 16, 0.035, 5, false);
  }

  // E 提示（main.js currentInteraction 用）：揀咗 Leash + 附近有野生動物
  function leashPrompt(w) {
    if (rescue.carrying) return { prompt: rescue.carrying.leashed ? `🪢 You already have the ${rescue.carrying.animal.name} on a leash - take it to the Hub!` : '🙌 Your hands are full - take your animal to the Hub first' };
    if (!w) return { prompt: '🪢 Walk up to an animal in a biome and press E to leash it!' };
    return { prompt: `<kbd>E</kbd> 🪢 Leash the ${w.animal.name}`, action: () => ctx.onLeash?.(w) };
  }

  // Ride 格嘅字（hud.js 用）
  hotbarHooks.rideLabel = () => {
    const pet = chosen();
    if (mount) return `🐎 Riding ${mount.pet.name} (x${mount.mult.toFixed(2)} speed) - press 1 to hop off`;
    if (pet) return `🐎 ${pet.name} - press 1 to ride! (E to pick another pet)`;
    return '🐎 Ride - press 1 to pick a pet to ride!';
  };
  hotbarHooks.onRide = () => press();

  const api = {
    press,
    openPicker,
    mount: mountPet,
    dismount,
    leash,
    leashPrompt,
    update,
    afterView,
    syncHotbar,
    get riding() {
      return !!mount;
    },
    get pet() {
      return mount?.pet || null;
    },
  };
  window.__riding = api; // 其他檔案（例如 Catch & Tame）：window.__riding?.dismount()
  return api;
}
