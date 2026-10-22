// 🗿 Statue of Halloween + 🔮 Halloween Shard（小朋友 Issue #6）
// 雕像：400 Soul Dust 換 1 粒 Halloween Shard（Issue #10：變做背包 ⚙️ Gears 入面嘅 gear，可以疊）
// 用 Shard（Issue #10）：背包揀一隻寵物 → 一定中，50/50 變 👻 Spectral ×4 或者 🟣 Phantom ×5（src/data/gears.js）
// 揀咗地塊上面嘅寵物就播動畫（好似 Steal an Egg）：地塊啲寵物一下消失 → 地塊上面開個 Halloween 傳送門 → 揀咗嗰隻俾吸上去 → 帶住新變異跌返落嚟 → 全部返嚟

import * as THREE from 'three';
import { state, save } from './state.js';
import { HALLOWEEN_SHARD_COST } from './data/balance.js';
import { addMutation, mutationInfo } from './data/animals.js';
import { addGear } from './data/gears.js';
import { gearPic } from './gearArt.js'; // 💎 Shard 圖示
import { STATUE_OF_HALLOWEEN, inGhostWorld } from './halloweenShape.js';
import { PLOT } from './hubShape.js';
import { extraPanels, openPanel, panelKind } from './hud.js';
import { playMovie, once, shake } from './movie.js';
import { short } from './format.js';
import { THEMES } from './signs.js';
import { beacon, glowSign } from './hwBeacons.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 雕像面板 ----------
function statueHtml() {
  const can = Math.floor(state.soulDust / HALLOWEEN_SHARD_COST);
  return `<p class="index-summary">💀 Soul Dust: <b>${short(state.soulDust)}</b> · 🔮 Halloween Shards: <b>${state.hwShards}</b></p>
    <div class="cards"><div class="card-animal" style="border-color:#b388ff">
      ${gearPic('halloweenShard')}<b>Halloween Shard</b>
      <small>Costs ${HALLOWEEN_SHARD_COST} 💀 Soul Dust</small>
      <p>It goes into your 🎒 Inventory (press <kbd>\`</kbd>) as a Gear. Pick any pet: it becomes 👻 SPECTRAL x${mutationInfo('spectral').money} or 🟣 PHANTOM x${mutationInfo('phantom').money}!</p>
      <div class="card-buttons">
        <button data-hw="trade" data-n="1" class="${can >= 1 ? '' : 'grey'}">Trade 1 (${HALLOWEEN_SHARD_COST} 💀)</button>
        ${can >= 2 ? `<button data-hw="trade" data-n="${can}">Trade ALL ${can} (${short(can * HALLOWEEN_SHARD_COST)} 💀)</button>` : ''}
      </div></div></div>
    <p class="hint">${can ? '' : `Catch more ghosts! You need ${short(HALLOWEEN_SHARD_COST - state.soulDust)} more Soul Dust for a shard.`}</p>`;
}
extraPanels.statue = ['🗿 Statue of Halloween', statueHtml, 'E'];

export function createShards({ scene, camera, hub, refreshPlot, popup, announce, play }) {
  const api = { teleportBack: null };
  // 雕像：紫色大燈 + 發光大牌 + 指路圈
  const statueBeacon = beacon(scene, STATUE_OF_HALLOWEEN.x, STATUE_OF_HALLOWEEN.z + 6, { color: 0xd500f9, radius: 1.8, lightY: 6, distance: 26 });
  const statueSign = glowSign([{ text: '🗿 STATUE OF HALLOWEEN', size: 0.4 }, { text: `Trade ${HALLOWEEN_SHARD_COST} Soul Dust for a 🔮 Shard · press E`, size: 0.2 }], 6, 1.5, THEMES.purple);
  statueSign.position.set(STATUE_OF_HALLOWEEN.x, 11, STATUE_OF_HALLOWEEN.z + 3);
  scene.add(statueSign);
  api.update = (t, pos) => inGhostWorld(pos.x, pos.z) && statueBeacon.update(t);
  function trade(n) {
    const most = Math.floor(state.soulDust / HALLOWEEN_SHARD_COST);
    n = Math.min(n, most);
    if (n <= 0) return popup(`💀 You need ${HALLOWEEN_SHARD_COST} Soul Dust for a Halloween Shard!`);
    state.soulDust -= n * HALLOWEEN_SHARD_COST;
    addGear('halloweenShard', n); // 🎒 入背包 Gears 分頁
    save();
    play('shard');
    popup(`🔮 You got ${n} Halloween Shard${n > 1 ? 's' : ''}! Open your 🎒 Inventory (\`) to use it on a pet.`);
  }
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hw="trade"]');
    if (!b || panelKind() !== 'statue') return;
    trade(Number(b.dataset.n));
    $('panel-body').innerHTML = statueHtml();
  });

  function interaction(pos) {
    if (!inGhostWorld(pos.x, pos.z)) return null;
    if (Math.hypot(pos.x - STATUE_OF_HALLOWEEN.x, pos.z - STATUE_OF_HALLOWEEN.z - 3) < 6) return { prompt: '<kbd>E</kbd> 🗿 Statue of Halloween: trade Soul Dust for Halloween Shards', action: () => openPanel('statue') };
    return null;
  }

  // ---------- 用 Shard（地塊動畫）：target = 背包揀咗嘅寵物（喺地塊上面），kind = 'spectral'／'phantom' ----------
  // Shard 已經喺背包扣咗；回傳 false = 播唔到（背包會改用卡仔特效）
  let busy = false;
  function useShard(target, kind) {
    if (busy) return false;
    if (hub.plot.pets.length !== state.pets.filter((p) => p.onPlot).length) refreshPlot(); // 地塊 3D 寵物同存檔對齊
    const entries = hub.plot.pets.slice();
    const mine = entries.find((e) => e.pet === target);
    if (!mine) return false;
    busy = true;
    const hits = [{ e: mine, pet: target, kind }];
    const cx = (PLOT.minX + PLOT.maxX) / 2;
    const cz = (PLOT.minZ + PLOT.maxZ) / 2;
    const portalY = 9;
    // 傳送門：紫橙漩渦 + 兩圈光環 + 火花
    const portal = new THREE.Group();
    portal.position.set(cx, portalY, cz);
    portal.scale.setScalar(0.01);
    const swirlMat = new THREE.MeshBasicMaterial({ color: 0x7c4dff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), swirlMat);
    disc.rotation.x = Math.PI / 2;
    portal.add(disc);
    const rings = [0xff9100, 0xd500f9].map((c, i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(3.6 + i * 0.5, 0.18, 8, 48), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2 }));
      r.rotation.x = Math.PI / 2;
      portal.add(r);
      return r;
    });
    scene.add(portal);
    // 噗！嘅煙
    const puffs = [];
    function puff(at) {
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd1c4e9, transparent: true, opacity: 0.8, depthWrite: false }));
        m.position.copy(at).add(V((Math.random() - 0.5) * 1.2, 0.5 + Math.random(), (Math.random() - 0.5) * 1.2));
        scene.add(m);
        puffs.push({ m, v: V((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), t: 0 });
      }
    }
    const home = new Map(entries.map((e) => [e.pet, e.group.position.clone()]));
    let rebuilt = false;
    let newGroups = [];
    const lucky = hits.map((h) => h.pet);
    // 鏡頭喺地塊西南面（噴水池嗰邊）高位望落去，唔會撞到樹籬
    const camFrom = { p: V(cx - 6, 17, cz + 19), l: V(cx, 2, cz) };
    const camTo = { p: V(cx - 5, 14, cz + 16), l: V(cx, 4, cz) };
    const camUp = { p: V(cx - 8, 5, cz + 10.5), l: V(cx, portalY - 1, cz) };
    const resultText = hits.length
      ? `🎉 ${hits.map((h) => `${mutationInfo(h.kind).emoji} ${h.pet.name} became ${mutationInfo(h.kind).name}!`).join('  ')}`
      : 'No luck this time... 🔮';
    play('shard');
    playMovie(camera, {
      length: hits.length ? 8.5 : 6.5,
      shots: [
        [0, 2.4, camFrom, camTo],
        [2.4, 5.4, camUp, { p: V(cx - 7, 6, cz + 9.5), l: V(cx, portalY, cz) }],
        [5.4, 9, camTo, camFrom],
      ],
      captions: [
        [0.2, '🔮 The Halloween Shard glows...'],
        [1.3, '🌀 A Halloween portal opens above your Plot!'],
        [hits.length ? 5.6 : 3.4, resultText],
      ],
      update(t, dt) {
        // 0–1.2 秒：全部寵物噗一聲消失
        if (once('poof')) {
          play('poof');
          for (const e of entries) puff(e.group.position);
        }
        const vanish = Math.max(0, 1 - t / 0.5);
        if (!rebuilt) for (const e of entries) {
          const isLucky = lucky.includes(e.pet);
          if (!isLucky || t < 2.4) e.group.scale.setScalar(vanish);
        }
        // 1.2–2.4 秒：傳送門慢慢開
        const open = THREE.MathUtils.clamp((t - 1.2) / 1.2, 0, 1) * (t > 7.2 ? Math.max(0, 1 - (t - 7.2) / 0.8) : 1);
        portal.scale.setScalar(Math.max(0.01, open));
        disc.rotation.z = t * 3;
        rings.forEach((r, i) => (r.rotation.z = t * (i ? -2 : 1.5)));
        swirlMat.opacity = 0.6 + Math.sin(t * 8) * 0.25;
        if (t > 1.2 && once('portal')) play('portal');
        // 2.4–4.6 秒：中咗嘅寵物俾吸上傳送門
        if (!rebuilt && t >= 2.4) {
          const k = THREE.MathUtils.clamp((t - 2.4) / 2.2, 0, 1);
          lucky.forEach((pet, i) => {
            const e = entries.find((x) => x.pet === pet);
            const a = (i / Math.max(1, lucky.length)) * Math.PI * 2 + t * 2;
            const r = 1.8 * (1 - k);
            e.group.position.set(cx + Math.cos(a) * r, k * k * portalY, cz + Math.sin(a) * r);
            e.group.rotation.y = t * 6;
            e.group.scale.setScalar(Math.max(0.01, 1 - k * 0.85));
          });
        }
        // 4.6–5.4 秒：傳送門閃一閃（變異！）
        if (hits.length && t > 4.6 && once('flash')) {
          shake(0.35);
          play('magic');
        }
        // 5.4 秒：帶住新變異返嚟
        if (!rebuilt && t >= (hits.length ? 5.4 : 3.4)) {
          rebuilt = true;
          for (const h of hits) h.pet.mutation = addMutation(h.pet, h.kind);
          save();
          refreshPlot();
          newGroups = hub.plot.pets.map((e) => ({ e, lucky: lucky.includes(e.pet), home: home.get(e.pet) || e.group.position.clone() }));
          for (const n of newGroups) n.e.group.scale.setScalar(0.01);
          if (hits.length) play('rescue');
        }
        if (rebuilt) {
          const t0 = hits.length ? 5.4 : 3.4;
          const k = THREE.MathUtils.clamp((t - t0) / 1.6, 0, 1);
          for (const n of newGroups) {
            if (n.lucky) {
              // 由傳送門跌返落嚟，彈一彈
              const y = portalY * (1 - k) * (1 - k) + Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k) * 0.8;
              n.e.group.position.set(n.home.x, y, n.home.z);
              n.e.group.scale.setScalar(Math.max(0.01, 0.3 + k * 0.7));
            } else {
              n.e.group.position.copy(n.home);
              n.e.group.scale.setScalar(Math.max(0.01, k));
            }
          }
        }
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i];
          p.t += dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.scale.setScalar(1 + p.t * 2);
          p.m.material.opacity = Math.max(0, 0.8 - p.t);
          if (p.t > 0.9) {
            scene.remove(p.m);
            puffs.splice(i, 1);
          }
        }
        return null;
      },
      onDone() {
        if (!rebuilt) {
          for (const h of hits) h.pet.mutation = addMutation(h.pet, h.kind);
          save();
          refreshPlot();
        }
        for (const e of hub.plot.pets) {
          e.group.scale.setScalar(1);
          e.group.position.y = 0;
        }
        scene.remove(portal);
        for (const p of puffs) scene.remove(p.m);
        busy = false;
        api.teleportBack?.();
        if (hits.length) announce(`${resultText} (x${mutationInfo(kind).money} money)`);

      },
    });
    return true;
  }

  return Object.assign(api, { trade, useShard, interaction, get busy() { return busy; } });
}
