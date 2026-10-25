// 🧩 Witch Tower 擴充（Issue #15）—— API 見 witchTower.js「擴充 API」
// 👑 5 個新 MINI-BOSS（小朋友 2026-10-25）：每 5 層輪住嚟（次序 = balance.js TOWER_BOSS_ORDER）
//   🐗 rider        Zombie Rider：殭屍騎住大野豬。豬刨地（紅色路線）→ 直線衝 → 轉身再衝；近身騎士揮燈籠棍
//                   HP 跌到一半（jumpOffAt）：騎士跳落嚟（riderZombie），豬同騎士一齊打，豬嬲咗衝得密啲
//   🧹 witch        Magical Witch：駝背殭屍女巫。慢慢飛嘅魔法彈（地上綠線 = 方向）、叫 💨 Dustler、間中坐掃把飛一陣
//                   打中 Dustler = 「噗」成個畫面好多塵（DOM 塵霧 + 場景霧變厚；疊加／重新計時，慢慢散）
//   🧛 vampiro      Vampiro：叫蝙蝠（towerZombies2.js 嘅 'bat'）、掟紅色「吸血鬼藥水」（地上一灘：殭屍企入去 = 快啲）
//                   蝙蝠霧 DASH（紅色路線）、跳起 SPLASH（大紅圈）
//   🎃 pumpkinBros  Pumpkin Brothers：大佬（Boss HP 條）+ 細佬（都係 boss: true，同一條 HP 條：e.bossGroup）
//                   大佬舉高細佬 → 掟過嚟（紅圈 + 落地震波）→ 細佬爬起身再打；細佬騎膊馬掟南瓜炸彈
//                   任何一個打散 = 爆開變 4 個細南瓜（smallPumpkin），細南瓜打散就冇
//   👻 banshee      Banshee Queen：飄浮鬼魂女王。SCREAM（地上扇形先出，走出去！）、閃一閃隱身 + 2–3 個假分身（一 hit 就散）
// 數值：balance.js TOWER_BOSSES（Boss）+ TOWER_ENEMIES 嘅 riderZombie／dustler／smallPumpkin／bansheeCopy（嘍囉，from: 999 = 唔會喺普通層出）
// 測試：game.tower.boss('rider'|'witch'|'vampiro'|'pumpkinBros'|'banshee')、game.tower.spawn('dustler')

import * as THREE from 'three';
import { addSounds } from './sound.js';
import { makeLabel } from './signs.js';
import { towerGlowTex } from './towerModels.js';
import {
  buildHogRider, buildRiderZombie, buildBogWitch, buildDustler, buildVampiro, buildPumpkinBro, buildSmallPumpkin, buildBanshee,
} from './towerBossModels.js';
import { TOWER_BOSSES, TOWER_ENEMIES } from './data/balance.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- 聲效 ----------
addSounds({
  tbHogSnort: (t, { noise, tone }) => {
    for (const d of [0, 0.28]) {
      noise(t + d, 0.22, { vol: 0.35, freq: 420, q: 1.2, type: 'bandpass' });
      tone(130, t + d, 0.2, { type: 'sawtooth', vol: 0.06, slide: 0.6 });
    }
  },
  tbHogCharge: (t, { noise, tone }) => {
    noise(t, 0.9, { vol: 0.4, freq: 320 });
    tone(85, t, 0.6, { type: 'square', vol: 0.07, slide: 0.55 });
  },
  tbHogSqueal: (t, { tone }) => {
    tone(820, t, 0.35, { type: 'square', vol: 0.05, slide: 1.6 });
    tone(1250, t + 0.3, 0.3, { type: 'square', vol: 0.05, slide: 0.6 });
  },
  tbSwing: (t, { noise }) => noise(t, 0.22, { vol: 0.3, freq: 1900, q: 0.8, type: 'bandpass' }),
  tbCackle: (t, { arp, tone }) => {
    arp(t, [880, 784, 932, 740, 988, 698], 0.075, { type: 'square', vol: 0.045 });
    tone(220, t, 0.5, { type: 'sawtooth', vol: 0.03, slide: 1.4 });
  },
  tbBolt: (t, { tone, noise }) => {
    tone(520, t, 0.4, { type: 'sine', vol: 0.1, slide: 2 });
    noise(t, 0.3, { vol: 0.12, freq: 3500, type: 'highpass' });
  },
  tbBoltHit: (t, { tone, arp }) => {
    tone(330, t, 0.3, { type: 'triangle', vol: 0.12, slide: 0.35 });
    arp(t, [1568, 1319, 1047], 0.04, { type: 'sine', vol: 0.06 });
  },
  tbDustPuff: (t, { noise }) => {
    noise(t, 0.7, { vol: 0.4, freq: 800 });
    noise(t + 0.05, 0.5, { vol: 0.15, freq: 2600, type: 'bandpass', q: 0.5 });
  },
  tbDustSummon: (t, { noise, tone }) => {
    noise(t, 1.1, { vol: 0.25, freq: 650, q: 0.5, type: 'bandpass' });
    tone(180, t, 1, { type: 'triangle', vol: 0.05, slide: 0.5 });
  },
  tbVampLaugh: (t, { arp, tone }) => {
    arp(t, [220, 196, 220, 175, 165], 0.13, { type: 'sawtooth', vol: 0.05 });
    tone(98, t, 0.8, { type: 'sine', vol: 0.12, slide: 0.8 });
  },
  tbBats: (t, { arp }) => {
    arp(t, [2400, 2900, 2200, 3100, 2600, 3300], 0.035, { type: 'square', vol: 0.025 });
    arp(t + 0.25, [2700, 2300, 3000, 2500], 0.035, { type: 'square', vol: 0.02 });
  },
  tbPotion: (t, { noise, tone, arp }) => {
    noise(t, 0.3, { vol: 0.28, freq: 1300, q: 0.8, type: 'bandpass' });
    tone(520, t, 0.2, { type: 'sine', vol: 0.1, slide: 0.4 });
    arp(t + 0.12, [700, 900, 650, 1000], 0.05, { type: 'sine', vol: 0.05 });
  },
  tbMist: (t, { noise, tone }) => {
    noise(t, 0.6, { vol: 0.25, freq: 3200, type: 'highpass' });
    tone(260, t, 0.5, { type: 'sawtooth', vol: 0.05, slide: 3 });
  },
  tbSlam: (t, { tone, noise }) => {
    tone(55, t, 0.9, { type: 'sine', vol: 0.5, slide: 0.5 });
    noise(t, 0.7, { vol: 0.5, freq: 420 });
  },
  tbThrow: (t, { tone, noise }) => {
    tone(200, t, 0.45, { type: 'triangle', vol: 0.1, slide: 2.6 });
    noise(t, 0.3, { vol: 0.15, freq: 1500, type: 'bandpass' });
  },
  tbHeyBro: (t, { arp }) => arp(t, [392, 523, 659], 0.09, { type: 'square', vol: 0.06 }),
  tbPumpkinSplit: (t, { arp, noise }) => {
    noise(t, 0.3, { vol: 0.3, freq: 1600, q: 0.7, type: 'bandpass' });
    arp(t + 0.05, [523, 659, 784, 1047], 0.05, { type: 'square', vol: 0.06 });
  },
  tbHop: (t, { tone }) => tone(380, t, 0.1, { type: 'sine', vol: 0.05, slide: 1.7 }),
  tbScreamCharge: (t, { tone }) => {
    tone(380, t, 1.2, { type: 'sine', vol: 0.06, slide: 2.4 });
    tone(570, t, 1.2, { type: 'triangle', vol: 0.035, slide: 2.4 });
  },
  tbScream: (t, { tone, noise }) => {
    tone(1500, t, 0.8, { type: 'sawtooth', vol: 0.06, slide: 0.6 });
    tone(1900, t, 0.7, { type: 'sine', vol: 0.08, slide: 0.7 });
    noise(t, 0.8, { vol: 0.3, freq: 2600, type: 'highpass' });
  },
  tbVanish: (t, { tone, noise }) => {
    tone(950, t, 0.5, { type: 'sine', vol: 0.08, slide: 0.3 });
    noise(t, 0.4, { vol: 0.12, freq: 3000, type: 'bandpass', q: 0.6 });
  },
  tbFake: (t, { arp }) => arp(t, [1319, 1047, 784, 523], 0.05, { type: 'triangle', vol: 0.08 }),
});

// ---------- 💨 塵霧畫面（打中 Dustler）----------
const DUST_CSS = `
#tb-dust { position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0; overflow: hidden;
  background: radial-gradient(ellipse at center, rgba(170, 145, 110, 0.35) 0%, rgba(150, 125, 92, 0.72) 55%, rgba(112, 92, 66, 0.96) 100%); }
#tb-dust .swirl { position: absolute; left: -50%; top: -50%; width: 200%; height: 200%; filter: blur(28px); opacity: 0.8;
  background: conic-gradient(from 0deg, rgba(200, 176, 136, 0) 0%, rgba(205, 180, 140, 0.55) 12%, rgba(200, 176, 136, 0) 28%, rgba(180, 155, 118, 0.5) 45%, rgba(200, 176, 136, 0) 60%, rgba(215, 190, 150, 0.5) 78%, rgba(200, 176, 136, 0) 100%);
  animation: tb-spin 7s linear infinite; }
#tb-dust .swirl.b { animation-duration: 11s; animation-direction: reverse; opacity: 0.6; }
#tb-dust i { position: absolute; border-radius: 50%; background: rgba(235, 215, 178, 0.85); box-shadow: 0 0 6px rgba(235, 215, 178, 0.6); animation: tb-speck var(--d, 3s) linear infinite; animation-delay: var(--dl, 0s); }
#tb-dust span { position: absolute; left: 50%; bottom: calc(260px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); font-weight: 900; font-size: 20px; color: #fff3e0; -webkit-text-stroke: 2px #4e342e; paint-order: stroke fill; white-space: nowrap; }
@keyframes tb-spin { to { transform: rotate(360deg); } }
@keyframes tb-speck { 0% { transform: translate(0, 0) scale(0.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--dx, 80px), var(--dy, -60px)) scale(1.3); opacity: 0; } }
`;
function buildDustUi() {
  const st = document.createElement('style');
  st.textContent = DUST_CSS;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.id = 'tb-dust';
  let html = '<div class="swirl"></div><div class="swirl b"></div>';
  for (let i = 0; i < 46; i++) {
    const s = 3 + Math.random() * 9;
    html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;--d:${(2 + Math.random() * 3).toFixed(2)}s;--dl:-${(Math.random() * 4).toFixed(2)}s;--dx:${((Math.random() - 0.3) * 260).toFixed(0)}px;--dy:${((Math.random() - 0.5) * 200).toFixed(0)}px"></i>`;
  }
  html += '<span>💨 DUSTY! You can\'t see well...</span>';
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

export function installTowerBosses(K) {
  const { A, R, play, popup, hitPlayer, spawnEnemy, removeEnemy, sparkle, floatText, ADDM, rand, clampTower } = K;
  const cfg = (id) => TOWER_BOSSES[id] || {};
  const ag = () => K.arena.g;
  const pl = () => {
    const p = K.playerPos();
    return V(p.x - A.x, p.y, p.z - A.z);
  };
  const W = (x, y, z) => V(A.x + x, y, A.z + z); // 本地 → 世界（sparkle 等用世界座標）
  const clampL = (x, z, m = 1.2) => {
    const w = V(x + A.x, 0, z + A.z);
    clampTower(w, m);
    return V(w.x - A.x, 0, w.z - A.z);
  };
  const go = (e, s) => {
    e.state = s;
    e.t = 0;
  };
  const tell = (flag, text) => {
    if (!R.run || R.run[flag]) return;
    R.run[flag] = true;
    popup(text);
  };
  const live = (o) => o && o.hp > 0 && K.enemies.includes(o) && o.state !== 'poof' && o.state !== 'cured';
  const aliveKind = (k) => K.alive().filter((o) => o.kind === k).length;

  // ================= 暫時嘢（警告、彈、藥水灘…）=================
  const things = [];
  function disposeObj(o) {
    o.removeFromParent();
    o.traverse((c) => {
      if (!c.isSprite && c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
      const ms = c.material ? [].concat(c.material) : [];
      for (const m of ms) if (!m.userData.keep) m.dispose();
    });
  }
  function addThing(t) { // { obj, owner?, life?, update?(dt, time, t) → true = 完 }
    if (t.obj && !t.obj.parent) ag().add(t.obj);
    t.t = 0;
    things.push(t);
    return t;
  }
  function killThing(t) {
    const i = things.indexOf(t);
    if (i >= 0) things.splice(i, 1);
    if (t.obj) disposeObj(t.obj);
    t.onKill?.();
  }
  // 紅色圓圈警告（實心 + 邊）
  function warnCircle(owner, x, z, r, color = 0xff1744, edgeColor = 0xff5252, fillK = 1) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 40), ADDM(color, 0.15));
    const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.16, r, 40), ADDM(edgeColor, 0.9));
    fill.rotation.x = edge.rotation.x = -PI / 2;
    edge.position.y = 0.01;
    g.add(fill, edge);
    g.position.set(x, 0.07, z);
    const t = addThing({ obj: g, owner, warn: true });
    t.set = (k, time = 0) => {
      fill.material.opacity = (0.1 + k * 0.4 + (k > 0.6 ? Math.sin(time * 30) * 0.07 : 0)) * fillK;
      edge.scale.setScalar(1.12 - k * 0.12);
    };
    t.set(0);
    return t;
  }
  // 扇形警告（Banshee 嘅 SCREAM）：half = 一半角度（rad）
  function warnCone(owner, len, half) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(len, 36, -half, half * 2), ADDM(0xff1744, 0.15));
    const edge = new THREE.Mesh(new THREE.RingGeometry(len - 0.3, len, 36, 1, -half, half * 2), ADDM(0xff5252, 0.9));
    fill.rotation.x = edge.rotation.x = -PI / 2;
    edge.position.y = 0.01;
    g.add(fill, edge);
    const t = addThing({ obj: g, owner, warn: true });
    t.aim = (x, z, dx, dz) => {
      g.position.set(x, 0.07, z);
      g.rotation.y = Math.atan2(-dz, dx);
    };
    t.set = (k, time = 0) => {
      fill.material.opacity = 0.1 + k * 0.38 + (k > 0.6 ? Math.sin(time * 30) * 0.07 : 0);
    };
    return t;
  }
  const killWarns = (e) => {
    for (const t of [...things]) if (t.owner === e && t.warn) killThing(t);
  };
  // 一圈擴散嘅光環（裝飾，冇傷害）
  function ringBurst(x, z, maxR, color, life = 0.45) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), ADDM(color, 0.9));
    m.rotation.x = -PI / 2;
    m.position.set(x, 0.12, z);
    addThing({
      obj: m, life,
      update: (dt, time, t) => {
        const k = t.t / life;
        m.scale.setScalar(0.5 + k * maxR);
        m.material.opacity = 0.9 * (1 - k);
      },
    });
  }
  // 一嚿嚿塵／煙（sprite 慢慢變大、透明）
  function puff(x, y, z, color, size = 2, life = 0.9, n = 6, spread = 1) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color, transparent: true, opacity: 0.8, depthWrite: false }));
      const a = Math.random() * PI * 2;
      s.position.set(x + Math.cos(a) * rand(0, 0.5) * spread, y + rand(-0.3, 0.4), z + Math.sin(a) * rand(0, 0.5) * spread);
      const vel = V(Math.cos(a) * rand(0.6, 1.8) * spread, rand(0.3, 1.2), Math.sin(a) * rand(0.6, 1.8) * spread);
      const s0 = size * rand(0.7, 1.2);
      addThing({
        obj: s, life: life * rand(0.8, 1.2),
        update: (dt, time, t) => {
          const k = t.t / t.life;
          s.position.addScaledVector(vel, dt);
          s.scale.setScalar(s0 * (0.6 + k * 1.4));
          s.material.opacity = 0.8 * (1 - k);
        },
      });
    }
  }
  // 拋物線飛（from → to，高 h，dur 秒）
  const arc = (from, to, h, k, out) => out.set(lerp(from.x, to.x, k), lerp(from.y, to.y, k) + Math.sin(k * PI) * h, lerp(from.z, to.z, k));

  // ================= 💨 塵霧 =================
  let dustUi = null;
  let dustT = 0;
  let dustMax = 1;
  let dustK = 0;
  const DUST_FOG = new THREE.Color(0x8d7b68);
  function addDust(sec) {
    dustUi ||= buildDustUi();
    dustT = Math.max(dustT, 0) + sec * (dustT > 0 ? 0.6 : 1); // 疊加：再打中多啲時間
    dustT = Math.min(dustT, sec * 2.5);
    dustMax = Math.max(dustMax, dustT);
    play('tbDustPuff');
    tell('toldDust', '💨 You hit a DUSTLER and it went PUFF! Everything is dusty for a few seconds...');
  }
  function updateDust(dt) {
    if (dustT > 0) dustT = Math.max(0, dustT - dt);
    const want = dustT > 0 ? Math.min(0.94, 0.7 + dustT * 0.08) * clamp01(dustT / 1.2) : 0;
    dustK += (want - dustK) * Math.min(1, dt * 6);
    if (dustUi) dustUi.style.opacity = dustK.toFixed(3);
    const scene = K.arena?.g.parent;
    if (scene?.fog && dustK > 0.01) {
      scene.fog.near = lerp(26, 1.5, dustK);
      scene.fog.far = lerp(120, 15, dustK);
      scene.fog.color.lerp(DUST_FOG, dustK * 0.85);
    }
  }

  // ================= 普通近身攻擊（舉手 → 紅圈 → 打落嚟）=================
  // o = { wind, r（紅圈半徑）, fwd（紅圈喺前面幾遠）, text, push }
  function meleeStart(e, o) {
    const p = e.g.position;
    e.melee = o;
    e.meleeAt = V(p.x + e.dir.x * o.fwd, 0, p.z + e.dir.z * o.fwd);
    e.meleeWarn = warnCircle(e, e.meleeAt.x, e.meleeAt.z, o.r);
    go(e, 'melee');
    play('tbSwing');
  }
  function meleeUpdate(e, dt, time, back = 'walk') {
    const o = e.melee;
    const u = e.model.userData;
    const k = e.t / o.wind;
    if (k < 1) {
      u.animate(time, 0, Math.min(0.6, k * 0.6));
      e.meleeWarn?.set(k, time);
      return;
    }
    if (!e.meleeHit) {
      e.meleeHit = true;
      if (e.meleeWarn) killThing(e.meleeWarn);
      e.meleeWarn = null;
      const p = pl();
      const d = Math.hypot(p.x - e.meleeAt.x, p.z - e.meleeAt.z);
      ringBurst(e.meleeAt.x, e.meleeAt.z, o.r, 0xff9100, 0.3);
      if (d < o.r + 0.3 && K.player.feetY < 1.6) {
        const dx = p.x - e.g.position.x;
        const dz = p.z - e.g.position.z;
        const dd = Math.max(0.1, Math.hypot(dx, dz));
        hitPlayer(o.text, { x: (dx / dd) * (o.push || 9), y: 5, z: (dz / dd) * (o.push || 9) });
      }
    }
    u.animate(time, 0, Math.min(1, 0.6 + (e.t - o.wind) / 0.25 * 0.4));
    if (e.t > o.wind + 0.45) {
      e.meleeHit = false;
      go(e, back);
    }
  }
  const nrm = (dx, dz, dist) => (dist > 0.01 ? [dx / dist, dz / dist] : [0, 0]);

  // ================= 🐗 ZOMBIE RIDER =================
  const rider = {
    build: ({ seed }) => buildHogRider({ seed }),
    reach: 3.6,
    radius: 1.9,
    init(e) {
      e.mounted = true;
      e.chargeCd = 3;
      e.cd = 1.5;
      e.charges = 0;
      e.enraged = false;
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const c = cfg('rider');
      const u = e.model.userData;
      const g = e.g;
      const [nx, nz] = nrm(dx, dz, dist);
      e.chargeCd -= dt;
      u.gallop = 1;
      u.snort = 0;
      switch (e.state) {
        case 'walk': {
          if (e.mounted && e.hp < e.maxHp * (c.jumpOffAt ?? 0.5)) { go(e, 'jumpOff'); return; }
          face(dx, dz, 3.5);
          e.dir.set(-Math.sin(g.rotation.y), 0, -Math.cos(g.rotation.y));
          const mv = dist > e.reach * 0.8 ? 1 : 0;
          if (mv) move(e.dir.x, e.dir.z, e.speed * (e.enraged ? 1.25 : 1));
          u.animate(time, mv, 0);
          if (e.chargeCd <= 0 && dist > 4 && dist < 28) {
            e.charges = 0;
            startSnort(e, dist, nx, nz);
          } else if (dist < e.reach + 0.6 && e.cd <= 0) {
            e.dir.set(nx, 0, nz);
            meleeStart(e, e.mounted
              ? { wind: 0.7, r: 2.4, fwd: 2.2, text: 'The Zombie Rider bonked you with his lantern', push: 10 }
              : { wind: 0.6, r: 2.2, fwd: 2.4, text: 'The hog tossed you with its tusks', push: 12 });
          }
          return;
        }
        case 'snort': { // 刨地：紅色路線（頭 40% 會跟住你轉，之後鎖定）
          const wind = e.charges ? 0.75 : (e.enraged ? 0.85 : 1.1);
          const k = e.t / wind;
          if (k < 0.4) {
            e.dir.set(nx, 0, nz);
            K.dashWarn(e, e.chargeLen);
          }
          face(e.dir.x, e.dir.z, 12);
          u.snort = 1;
          u.animate(time, 0, 0);
          if (e.warnM) e.warnM.material.opacity = 0.15 + k * 0.4 + Math.sin(e.t * 24) * 0.07;
          if (Math.random() < dt * 14) puff(g.position.x + rand(-1, 1), 0.3, g.position.z + rand(-1, 1), 0xa1887f, 1.2, 0.6, 1, 0.6);
          if (k >= 1) {
            go(e, 'charge');
            e.hitDone = false;
            e.run = 0;
            play('tbHogCharge');
          }
          return;
        }
        case 'charge': {
          const sp = (c.charge ?? 17) * Math.sqrt(K.speedMul(R.floor)) * (e.enraged ? 1.12 : 1);
          const x0 = g.position.x;
          const z0 = g.position.z;
          g.position.x += e.dir.x * sp * dt;
          g.position.z += e.dir.z * sp * dt;
          const cl = clampL(g.position.x, g.position.z, e.radius + 0.4);
          const blocked = Math.hypot(cl.x - g.position.x, cl.z - g.position.z) > 0.05;
          g.position.x = cl.x;
          g.position.z = cl.z;
          e.run += sp * dt;
          u.gallop = 2.2;
          u.animate(time, 1, 0);
          if (e.warnM) e.warnM.material.opacity *= Math.exp(-dt * 3);
          if (Math.random() < dt * 25) puff(x0, 0.4, z0, 0xa1887f, 1.4, 0.7, 1, 0.4);
          const p = pl();
          const pd = Math.hypot(p.x - g.position.x, p.z - g.position.z);
          if (!e.hitDone && pd < e.radius + 1.0 && K.player.feetY < 1.6) {
            e.hitDone = true;
            hitPlayer("The Zombie Rider's hog CHARGED into you", { x: e.dir.x * 15, y: 6, z: e.dir.z * 15 });
          }
          if (e.run >= e.chargeLen || blocked) {
            if (e.warnM) e.warnM.visible = false;
            e.charges += 1;
            if (blocked) {
              K.addShake(0.45);
              puff(g.position.x, 1, g.position.z, 0xbcaaa4, 2, 0.8, 8, 1.4);
              go(e, 'dizzy');
              floatText(W(g.position.x, u.height + 0.6, g.position.z), [{ text: '💫 BONK! Dizzy!', color: '#ffd740' }], 1, 1.2);
              tell('toldHogDizzy', '🐗 The hog crashed into the wall and is DIZZY! Hit it now!');
            } else if (e.charges < (c.chargesInARow ?? 2) + (e.enraged ? 1 : 0)) {
              const [ax, az] = nrm(p.x - g.position.x, p.z - g.position.z, pd);
              startSnort(e, pd, ax, az); // 轉身再衝
            } else go(e, 'skid');
          }
          return;
        }
        case 'skid': // 停低喘氣（好機會打佢）
        case 'dizzy': {
          const dur = e.state === 'dizzy' ? 1.6 : 1.0;
          u.animate(time, 0, 0);
          if (e.state === 'dizzy') g.rotation.z = Math.sin(e.t * 10) * 0.07;
          if (e.t > dur) {
            g.rotation.z = 0;
            e.chargeCd = (c.chargeEvery ?? 5) * (e.enraged ? 0.65 : 1) / Math.sqrt(K.speedMul(R.floor));
            e.cd = 0.6;
            go(e, 'walk');
          }
          return;
        }
        case 'melee':
          meleeUpdate(e, dt, time);
          if (e.state === 'walk') e.cd = 1.4;
          return;
        case 'jumpOff': { // 🧟 騎士跳落嚟：豬同騎士一齊打
          u.animate(time, 0, 0);
          if (e.t > 0.05 && e.mounted) {
            e.mounted = false;
            u.setMounted(false);
            spawnRider(e);
            e.enraged = true;
            play('tbHogSqueal');
            floatText(W(g.position.x, 4.5, g.position.z), [{ text: '🧟 HE JUMPED OFF!', color: '#ffab40' }], 1.2, 1.6);
            popup('🐗 The Zombie Rider jumped off his hog! Now they BOTH fight, and the hog is ANGRY!');
          }
          if (e.t > 0.9) {
            e.chargeCd = 1.2;
            go(e, 'walk');
          }
          return;
        }
        default: go(e, 'walk');
      }
    },
    onPoof(e) {
      if (e.mounted) spawnRider(e); // 一下打散：騎士跌落嚟繼續打
      e.mounted = false;
    },
  };
  function startSnort(e, dist, nx, nz) {
    e.dir.set(nx, 0, nz);
    e.chargeLen = Math.min(cfg('rider').chargeLen ?? 24, dist + 7);
    K.dashWarn(e, e.chargeLen);
    go(e, 'snort');
    play('tbHogSnort');
    tell('toldHog', '🐗 The hog is about to CHARGE! Get out of the red lane!');
  }
  function spawnRider(e) {
    const g = e.g.position;
    const side = V(-e.dir.z, 0, e.dir.x);
    const at = clampL(g.x + side.x * 2.6, g.z + side.z * 2.6, 1.2);
    const m = spawnEnemy('riderZombie', { at: { x: A.x + at.x, z: A.z + at.z, glow: 0 } });
    m.state = 'walk';
    m.g.position.y = 0;
    m.hop = 0.45;
    m.cd = 0.9;
    sparkle(W(at.x, 1.5, at.z), 0xffab40, 16, 4, 0.7, 0.6);
    play('zombieGroan');
  }

  // ================= 🧹 MAGICAL WITCH =================
  const witch = {
    build: ({ seed }) => buildBogWitch({ seed }),
    reach: 2.4,
    radius: 1.0,
    init(e) {
      e.boltCd = 2.5;
      e.sumCd = 4;
      e.flyCd = cfg('witch').flyEvery ?? 15;
      e.alt = 0;
      e.flyA = Math.atan2(e.g.position.z, e.g.position.x);
      setTimeout(() => live(e) && play('tbCackle'), 1200);
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const c = cfg('witch');
      const u = e.model.userData;
      const g = e.g;
      const [nx, nz] = nrm(dx, dz, dist);
      e.boltCd -= dt;
      e.sumCd -= dt;
      e.flyCd -= dt;
      g.position.y = e.alt;
      u.cast = 0;
      switch (e.state) {
        case 'walk': {
          e.alt = 0;
          u.setFly(0);
          face(dx, dz, 6);
          const want = dist > 13 ? 1 : dist < 7 ? -0.8 : 0;
          if (want) move(nx * want, nz * want, e.speed);
          u.animate(time, Math.abs(want), 0);
          if (e.sumCd <= 0 && aliveKind('dustler') < (c.maxDustlers ?? 6) && K.alive().length < K.maxAtOnce + 3) startSummon(e);
          else if (e.flyCd <= 0) { go(e, 'takeoff'); play('tbCackle'); }
          else if (e.boltCd <= 0 && dist < 26) { e.back = 'walk'; go(e, 'cast'); }
          else if (dist < e.reach && e.cd <= 0) meleeStart(e, { wind: 0.6, r: 2.0, fwd: 1.6, text: 'The witch whacked you with her staff', push: 9 });
          return;
        }
        case 'melee':
          meleeUpdate(e, dt, time);
          if (e.state === 'walk') e.cd = 1.6;
          return;
        case 'cast': { // 法杖發光 + 地上綠線（方向）→ 慢慢飛嘅魔法彈
          const wind = e.back === 'fly' ? 0.7 : 0.9;
          const k = e.t / wind;
          face(dx, dz, 8);
          u.cast = k;
          u.animate(time, 0, 0);
          K.lineWarn(e, Math.min(20, dist + 2), 0xb2ff59).material.opacity = 0.12 + k * 0.4;
          if (k >= 1) {
            if (e.lineM) e.lineM.visible = false;
            fireBolt(e);
            e.boltCd = (c.boltEvery ?? 3.2) * (e.back === 'fly' ? 0.55 : 1);
            if (e.back === 'fly') { // 返去飛：飛咗幾耐照計
              e.state = 'fly';
              e.t += e.flyKeepT || 0;
            } else go(e, 'walk');
          }
          return;
        }
        case 'summon': { // 地上 3 個塵圈 → Dustler 爬出嚟
          u.cast = 1;
          u.animate(time, 0, 0);
          for (const m of e.dustMarks) m.obj.rotation.z += dt * 4;
          if (Math.random() < dt * 20) {
            const m = e.dustMarks[Math.floor(Math.random() * e.dustMarks.length)];
            puff(m.obj.position.x, 0.4, m.obj.position.z, 0xa1887f, 1.2, 0.7, 1, 0.5);
          }
          if (e.t >= 1.2) {
            for (const m of e.dustMarks) {
              const d = spawnEnemy('dustler', { at: { x: A.x + m.obj.position.x, z: A.z + m.obj.position.z, glow: 0 } });
              d.cd = 1;
              killThing(m);
            }
            e.dustMarks = [];
            e.sumCd = c.summonEvery ?? 11;
            tell('toldDustler', '🧹 The witch made DUSTLERS 💨! If you hit one, your screen gets VERY dusty. Poof them fast or stay away!');
            go(e, 'walk');
          }
          return;
        }
        case 'takeoff': { // 🧹 坐上掃把飛起
          const k = clamp01(e.t / 1.0);
          u.setFly(k);
          e.alt = k * 4.2;
          g.position.y = e.alt;
          face(dx, dz, 4);
          u.animate(time, 0, 0);
          if (Math.random() < dt * 20) sparkle(W(g.position.x, e.alt + 1, g.position.z), 0x76ff03, 1, 1.5, 0.6, 0.5);
          if (k >= 1) {
            go(e, 'fly');
            e.flyA = Math.atan2(g.position.z, g.position.x);
            tell('toldBroom', '🧹 The witch is FLYING on her broom! Aim up!');
          }
          return;
        }
        case 'fly': { // 繞住個房飛，掟多啲魔法彈
          e.flyA += dt * 0.55;
          const r = 12;
          const tx = Math.cos(e.flyA) * r;
          const tz = Math.sin(e.flyA) * r;
          const mx = tx - g.position.x;
          const mz = tz - g.position.z;
          const md = Math.hypot(mx, mz) || 1;
          move(mx / md, mz / md, Math.min(md * 3, e.speed * 3.2));
          face(mx, mz, 4);
          e.alt = 4.2 + Math.sin(time * 1.8) * 0.4;
          g.position.y = e.alt;
          u.setFly(1);
          u.animate(time, 0, 0);
          if (Math.random() < dt * 12) sparkle(W(g.position.x, e.alt + 1, g.position.z), 0x76ff03, 1, 0.8, 0.8, 0.5);
          if (e.t > (c.flyTime ?? 7)) go(e, 'land');
          else if (e.boltCd <= 0 && dist < 30) {
            e.back = 'fly';
            e.flyKeepT = e.t;
            go(e, 'cast');
            e.t = 0;
          }
          return;
        }
        case 'land': {
          const k = clamp01(e.t / 1.0);
          e.alt = (1 - k) * 4.2;
          g.position.y = e.alt;
          u.setFly(1 - k);
          face(dx, dz, 4);
          u.animate(time, 0, 0);
          if (k >= 1) {
            e.alt = 0;
            e.flyCd = c.flyEvery ?? 15;
            puff(g.position.x, 0.4, g.position.z, 0xa1887f, 1.5, 0.7, 6, 1);
            go(e, 'walk');
          }
          return;
        }
        default: go(e, 'walk');
      }
    },
    remove(e) {
      for (const m of e.dustMarks || []) killThing(m);
    },
  };
  function startSummon(e) {
    go(e, 'summon');
    play('tbDustSummon');
    const p = pl();
    const g = e.g.position;
    const n = cfg('witch').dustlers ?? 3;
    e.dustMarks = [];
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(p.z - g.z, p.x - g.x) + (i - (n - 1) / 2) * 0.7;
      const at = clampL(g.x + Math.cos(a) * 3.5, g.z + Math.sin(a) * 3.5, 1.5);
      const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.3, 24, 1), ADDM(0xbcaaa4, 0.55));
      m.material.blending = THREE.NormalBlending;
      m.rotation.x = -PI / 2;
      m.position.set(at.x, 0.06, at.z);
      e.dustMarks.push(addThing({ obj: m, owner: e }));
    }
  }
  function fireBolt(e) {
    const u = e.model.userData;
    const wp = V();
    u.orb.getWorldPosition(wp);
    const from = V(wp.x - A.x, wp.y, wp.z - A.z);
    const p = pl();
    const to = V(p.x, p.y + 1.0, p.z);
    const c = cfg('witch');
    const vel = to.clone().sub(from).normalize().multiplyScalar(c.boltSpeed ?? 8);
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0xccff90, emissive: 0x76ff03, emissiveIntensity: 2.4, flatShading: true }));
    const h1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x76ff03, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    h1.scale.setScalar(1.9);
    const h2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xe040fb, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    h2.scale.setScalar(1.2);
    g.add(core, h1, h2);
    g.position.copy(from);
    play('tbBolt');
    addThing({
      obj: g, life: 4.5,
      update: (dt, time, t) => {
        // 慢慢轉向你（轉得唔快：郁開就避到）
        const pp = pl();
        const want = V(pp.x, pp.y + 1.0, pp.z).sub(g.position).normalize().multiplyScalar(vel.length());
        vel.lerp(want, Math.min(1, dt * 0.7));
        g.position.addScaledVector(vel, dt);
        core.rotation.x += dt * 5;
        core.rotation.y += dt * 4;
        h2.material.opacity = 0.45 + Math.sin(time * 20) * 0.2;
        if (Math.random() < dt * 30) sparkle(W(g.position.x, g.position.y, g.position.z), Math.random() < 0.5 ? 0x76ff03 : 0xe040fb, 1, 0.4, 0.5, 0.35);
        const hd = Math.hypot(pp.x - g.position.x, pp.z - g.position.z);
        const hitMe = hd < 0.95 && Math.abs(g.position.y - (pp.y + 0.9)) < 1.3;
        const out = Math.hypot(g.position.x, g.position.z) > A.r - 1 || g.position.y < 0.1;
        if (hitMe || out) {
          sparkle(W(g.position.x, g.position.y, g.position.z), 0x76ff03, 14, 3, 0.6, 0.55);
          play('tbBoltHit');
          if (hitMe) hitPlayer("Zap! The witch's magic bolt got you", { x: vel.x * 0.6, y: 4, z: vel.z * 0.6 });
          return true;
        }
        return false;
      },
    });
  }
  // 💨 Dustler
  const dustler = {
    build: ({ seed }) => buildDustler({ seed }),
    reach: 1.4,
    radius: 0.55,
    flying: true,
    update(e, dt, time, o) {
      K.baseUpdate(e, dt, time, o);
      if (Math.random() < dt * 3) puff(e.g.position.x + rand(-0.4, 0.4), 0.3, e.g.position.z + rand(-0.4, 0.4), 0xa1887f, 0.8, 0.6, 1, 0.3);
    },
    onHit(e, dmg, info) {
      if (info.angryHit) return dmg;
      dustBurst(e);
      return dmg;
    },
    onPoof(e) {
      dustBurst(e, 1.6);
    },
  };
  function dustBurst(e, big = 1) {
    const g = e.g.position;
    puff(g.x, 1, g.z, 0xa1887f, 2.4 * big, 1.1, 8, 1.6 * big);
    puff(g.x, 1, g.z, 0xd7ccc8, 1.6 * big, 0.8, 4, 1.2);
    // 打得近先好多塵；遠（> 18 米）淡少少
    const p = pl();
    const d = Math.hypot(p.x - g.x, p.z - g.z);
    addDust((cfg('witch').dustTime ?? 4) * (d > 18 ? 0.6 : 1));
  }

  // ================= 🧛 VAMPIRO =================
  // 🦇 細蝙蝠（DASH 嗰陣圍住佢飛）：共用 geometry／material（keep = 唔好 dispose）
  const batGeo = new THREE.BoxGeometry(0.22, 0.16, 0.2);
  const wingGeo = new THREE.BoxGeometry(0.38, 0.03, 0.2);
  batGeo.userData.keep = wingGeo.userData.keep = true;
  const batMat = new THREE.MeshStandardMaterial({ color: 0x1a0f24, emissive: 0x4a0018, emissiveIntensity: 0.6, roughness: 0.6 });
  batMat.userData.keep = true;
  function miniBat() {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(batGeo, batMat));
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(wingGeo, batMat);
      w.position.x = sx * 0.28;
      b.add(w);
    }
    return b;
  }
  const vampiro = {
    build: ({ seed }) => buildVampiro({ seed }),
    reach: 2.8,
    radius: 1.2,
    init(e) {
      e.batCd = 5;
      e.potCd = 3;
      e.spCd = 6;
      setTimeout(() => live(e) && play('tbVampLaugh'), 1000);
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const c = cfg('vampiro');
      const u = e.model.userData;
      const g = e.g;
      const [nx, nz] = nrm(dx, dz, dist);
      e.batCd -= dt;
      e.potCd -= dt;
      e.spCd -= dt;
      u.spread = 0;
      u.crouch = 0;
      switch (e.state) {
        case 'walk': {
          u.mist = 0;
          g.position.y = 0;
          face(dx, dz, 6);
          e.dir.set(nx, 0, nz);
          const mv = dist > e.reach * 0.85 ? 1 : 0;
          if (mv) move(nx, nz, e.speed);
          u.animate(time, mv, 0);
          if (e.batCd <= 0) {
            go(e, 'bats');
            play('tbVampLaugh');
          } else if (e.potCd <= 0 && dist < 22) {
            go(e, 'potion');
          } else if (e.spCd <= 0 && dist < 30) { // 輪住嚟：DASH（遠啲先用）↔ SPLASH
            e.dashNext = !e.dashNext;
            if ((e.dashNext && dist > 5) || dist > 16) {
              go(e, 'mistWind');
              play('tbMist');
              tell('toldMist', '🧛 Vampiro turns into BAT MIST and DASHES! Get out of the red lane!');
            } else startLeap(e);
          } else if (dist < e.reach + 0.5 && e.cd <= 0) {
            meleeStart(e, { wind: 0.6, r: 2.4, fwd: 2.0, text: 'Vampiro swiped you with his cape', push: 10 });
          }
          return;
        }
        case 'melee':
          meleeUpdate(e, dt, time);
          if (e.state === 'walk') e.cd = 1.5;
          return;
        case 'bats': { // 披風張開 → 蝙蝠飛出嚟
          u.spread = 1;
          face(dx, dz, 4);
          u.animate(time, 0, 0);
          if (Math.random() < dt * 25) sparkle(W(g.position.x + rand(-1.5, 1.5), rand(2, 4.5), g.position.z + rand(-1.5, 1.5)), 0xff1744, 1, 1, 0.6, 0.5);
          if (e.t >= 1.0) {
            const kind = TOWER_ENEMIES.bat ? 'bat' : 'runner'; // 'bat' 由 towerZombies2.js 整（未有就用 Speedy Zombie）
            const n = Math.min(c.bats ?? 3, Math.max(0, K.maxAtOnce + 3 - K.alive().length));
            for (let i = 0; i < n; i++) {
              const a = g.rotation.y + PI / 2 + (i - (n - 1) / 2) * 0.9;
              const at = clampL(g.position.x - Math.sin(a) * 2.2, g.position.z - Math.cos(a) * 2.2, 1.2);
              const b = spawnEnemy(kind, { at: { x: A.x + at.x, z: A.z + at.z, glow: 0 } });
              b.packDone = true; // 🦇 Vampiro 自己叫 3 隻：唔好每隻再帶一群
              b.state = 'walk';
              b.g.position.y = 0;
              b.hop = 0.45;
              sparkle(W(at.x, 1.5, at.z), 0xff1744, 10, 3, 0.6, 0.5);
            }
            if (n) {
              play('tbBats');
              tell('toldBats', '🧛 Vampiro summons BATS! 🦇');
            }
            e.batCd = c.batEvery ?? 13;
            go(e, 'walk');
          }
          return;
        }
        case 'potion': { // 🧪 舉高 → 掟 3 支吸血鬼藥水（紅圈 = 會變一灘）
          face(dx, dz, 8);
          u.animate(time, 0, Math.min(0.6, e.t));
          if (e.t >= 0.7) {
            const p = pl();
            const spots = [V(p.x, 0, p.z)];
            for (let i = 0; i < 2; i++) {
              const a = Math.random() * PI * 2;
              spots.push(V(p.x + Math.cos(a) * rand(3, 6), 0, p.z + Math.sin(a) * rand(3, 6)));
            }
            for (const s of spots) throwPotion(e, clampL(s.x, s.z, 2.4));
            play('tbThrow');
            e.potCd = c.potionEvery ?? 9;
            go(e, 'walk');
          }
          return;
        }
        case 'mistWind': { // 🦇 變霧：縮細 + 紅色路線
          const wind = 0.9;
          const k = e.t / wind;
          if (k < 0.45) {
            e.dir.set(nx, 0, nz);
            e.dashLen = Math.min(c.dashLen ?? 22, dist + 6);
            K.dashWarn(e, e.dashLen);
          }
          face(e.dir.x, e.dir.z, 12);
          u.spread = 1;
          u.mist = k * 0.85;
          u.animate(time, 0, 0);
          if (e.warnM) e.warnM.material.opacity = 0.15 + k * 0.4 + Math.sin(e.t * 24) * 0.07;
          if (Math.random() < dt * 30) sparkle(W(g.position.x + rand(-1, 1), rand(1, 4), g.position.z + rand(-1, 1)), 0xb71c1c, 1, 1.2, 0.5, 0.7);
          if (k >= 1) {
            go(e, 'mistDash');
            e.hitDone = false;
            e.run = 0;
            e.mistBats = [];
            for (let i = 0; i < 7; i++) {
              const b = miniBat();
              b.userData.a = (i / 7) * PI * 2;
              b.userData.y = rand(0.8, 3.4);
              e.mistBats.push(addThing({ obj: b, owner: e, warn: true }));
            }
            play('tbBats');
          }
          return;
        }
        case 'mistDash': {
          const sp = (c.dashSpeed ?? 24) * Math.sqrt(K.speedMul(R.floor));
          g.position.x += e.dir.x * sp * dt;
          g.position.z += e.dir.z * sp * dt;
          const cl = clampL(g.position.x, g.position.z, e.radius + 0.4);
          const blocked = Math.hypot(cl.x - g.position.x, cl.z - g.position.z) > 0.05;
          g.position.x = cl.x;
          g.position.z = cl.z;
          e.run += sp * dt;
          u.mist = 1;
          u.spread = 1;
          u.animate(time, 0, 0);
          if (e.warnM) e.warnM.material.opacity *= Math.exp(-dt * 3);
          for (const t of e.mistBats) { // 一群蝙蝠圍住佢轉
            const b = t.obj;
            b.userData.a += dt * 9;
            b.position.set(g.position.x + Math.cos(b.userData.a) * 1.3, b.userData.y + Math.sin(time * 9 + b.userData.a) * 0.3, g.position.z + Math.sin(b.userData.a) * 1.3);
            b.rotation.y = -b.userData.a;
            b.children[1].rotation.z = Math.sin(time * 40 + b.userData.a) * 0.8;
            b.children[2].rotation.z = -Math.sin(time * 40 + b.userData.a) * 0.8;
          }
          if (Math.random() < dt * 40) sparkle(W(g.position.x + rand(-0.8, 0.8), rand(0.8, 3.5), g.position.z + rand(-0.8, 0.8)), Math.random() < 0.5 ? 0xff1744 : 0x4a148c, 1, 0.8, 0.6, 0.8);
          const p = pl();
          if (!e.hitDone && Math.hypot(p.x - g.position.x, p.z - g.position.z) < e.radius + 1.0 && K.player.feetY < 2.2) {
            e.hitDone = true;
            hitPlayer("Vampiro's bat-mist DASH hit you", { x: e.dir.x * 14, y: 5, z: e.dir.z * 14 });
          }
          if (e.run >= e.dashLen || blocked) {
            if (e.warnM) e.warnM.visible = false;
            for (const t of e.mistBats) killThing(t);
            e.mistBats = [];
            sparkle(W(g.position.x, 2, g.position.z), 0xff1744, 24, 5, 0.7, 0.7);
            go(e, 'reform');
          }
          return;
        }
        case 'reform': {
          u.mist = 1 - clamp01(e.t / 0.5);
          u.spread = 1 - clamp01(e.t / 0.5);
          u.animate(time, 0, 0);
          if (e.t > 0.9) {
            e.spCd = c.specialEvery ?? 5.5;
            go(e, 'walk');
          }
          return;
        }
        case 'leapWind': { // 踎低（紅色大圈 = 跌落嚟嘅位）
          const k = e.t / 0.75;
          face(e.leapTo.x - g.position.x, e.leapTo.z - g.position.z, 10);
          u.crouch = Math.min(1, k * 2);
          u.spread = 0.4;
          u.animate(time, 0, 0);
          e.leapWarn?.set(k * 0.6, time);
          if (k >= 1) {
            go(e, 'leap');
            e.leapFrom = V(g.position.x, 0, g.position.z);
            play('chargeGo');
          }
          return;
        }
        case 'leap': {
          const k = clamp01(e.t / 0.85);
          const v = arc(e.leapFrom, e.leapTo, 6.5, k, V());
          g.position.set(v.x, v.y, v.z);
          u.spread = 1;
          u.animate(time, 0, 0.3);
          e.leapWarn?.set(0.6 + k * 0.4, time);
          if (k >= 1) {
            g.position.y = 0;
            if (e.leapWarn) killThing(e.leapWarn);
            e.leapWarn = null;
            const r = c.splashR ?? 4.5;
            play('tbSlam');
            K.addShake(0.6);
            ringBurst(g.position.x, g.position.z, r + 0.5, 0xff1744, 0.5);
            ringBurst(g.position.x, g.position.z, r * 0.7, 0xff80ab, 0.35);
            sparkle(W(g.position.x, 0.5, g.position.z), 0xff1744, 30, 7, 0.6, 0.8);
            const p = pl();
            const pdx = p.x - g.position.x;
            const pdz = p.z - g.position.z;
            const pd = Math.max(0.1, Math.hypot(pdx, pdz));
            if (pd < r + 0.3 && K.player.feetY < 1.5) hitPlayer("Vampiro's SPLASH attack got you", { x: (pdx / pd) * 12, y: 6, z: (pdz / pd) * 12 });
            makePuddle(g.position.x, g.position.z, 2.6);
            go(e, 'leapRec');
          }
          return;
        }
        case 'leapRec': { // 落地之後喘一喘
          u.crouch = 1 - clamp01(e.t / 0.6);
          u.animate(time, 0, 0);
          if (e.t > 1.0) {
            e.spCd = c.specialEvery ?? 5.5;
            go(e, 'walk');
          }
          return;
        }
        default: go(e, 'walk');
      }
    },
    remove(e) {
      for (const t of e.mistBats || []) killThing(t);
    },
  };
  function startLeap(e) {
    const p = pl();
    e.leapTo = clampL(p.x, p.z, 2);
    e.leapWarn = warnCircle(e, e.leapTo.x, e.leapTo.z, cfg('vampiro').splashR ?? 4.5);
    go(e, 'leapWind');
    play('chargeUp');
    tell('toldSplash', '🧛 Vampiro is going to JUMP and SPLASH! Run out of the big red circle!');
  }
  // 🧪 吸血鬼藥水：拋物線 → 一灘發光紅色魔法水（殭屍企入去 = 快啲）
  function throwPotion(e, to) {
    const from = V(e.g.position.x, e.model.userData.height * 0.9, e.g.position.z);
    const vial = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xd50000, emissiveIntensity: 1.6, roughness: 0.2, transparent: true, opacity: 0.9 }));
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
    cork.position.y = 0.28;
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xff1744, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    h.scale.setScalar(1.1);
    vial.add(glass, cork, h);
    vial.position.copy(from);
    const warn = warnCircle(null, to.x, to.z, 2.2, 0xff4081, 0xff80ab, 0.25); // 淡淡嘅圈 = 藥水會跌喺度（唔扣心）
    const dur = rand(0.85, 1.05);
    const target = V(to.x, 0.2, to.z);
    addThing({
      obj: vial, life: dur + 0.01,
      update: (dt, time, t) => {
        const k = clamp01(t.t / dur);
        arc(from, target, 5, k, vial.position);
        vial.rotation.x += dt * 9;
        vial.rotation.z += dt * 6;
        warn.set(k * 0.5, time);
        if (k >= 1) {
          killThing(warn);
          play('tbPotion');
          sparkle(W(to.x, 0.4, to.z), 0xff1744, 18, 4, 0.6, 0.6);
          makePuddle(to.x, to.z, 2.2);
          return true;
        }
        return false;
      },
    });
  }
  const puddles = [];
  function makePuddle(x, z, r) {
    const c = cfg('vampiro');
    while (puddles.length >= 7) killThing(puddles[0]);
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({ color: 0x4a0010, emissive: 0xb0002a, emissiveIntensity: 0.55, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85, depthWrite: false }));
    pool.rotation.x = -PI / 2;
    pool.scale.set(1, 0.85 + Math.random() * 0.3, 1);
    const shine = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 28), ADDM(0xff1744, 0.6));
    shine.rotation.x = -PI / 2;
    shine.position.y = 0.01;
    shine.scale.copy(pool.scale);
    const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xff1744, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    glowS.scale.set(r * 2.4, r * 0.9, 1);
    glowS.position.y = 0.3;
    g.add(pool, shine, glowS);
    const life = c.puddleTime ?? 10;
    const t = addThing({
      obj: g, life, puddle: true,
      update: (dt, time, th) => {
        const grow = clamp01(th.t / 0.35);
        const fade = clamp01((life - th.t) / 2);
        g.scale.setScalar(Math.max(0.01, grow));
        pool.material.opacity = 0.85 * fade;
        shine.material.opacity = (0.4 + Math.sin(time * 4 + x) * 0.2) * fade;
        glowS.material.opacity = 0.2 * fade;
        if (Math.random() < dt * 6) sparkle(W(x + rand(-r, r) * 0.7, 0.2, z + rand(-r, r) * 0.7), 0xff5252, 1, 0.6, 0.7, 0.35); // 冒泡
        // 殭屍企入去 = 快啲（Boss 唔計）
        for (const o of K.enemies) {
          if (o.boss || o.hp <= 0 || o.state === 'poof' || o.state === 'cured' || o.g.position.y > 0.8) continue;
          if (Math.hypot(o.g.position.x - x, o.g.position.z - z) < r + o.radius * 0.5) {
            if (!(o.buffT > 0)) sparkle(W(o.g.position.x, 1.2, o.g.position.z), 0xff1744, 6, 2, 0.5, 0.5);
            K.buffEnemy(o, { time: 3, speed: c.puddleSpeed ?? 1.6, hearts: 0, color: 0xff1744 });
            tell('toldPuddle', '🧪 Zombies that step in the red VAMPIRE POTION get FAST! Keep them away from it!');
          }
        }
        return false;
      },
    });
    t.onKill = () => {
      const i = puddles.indexOf(t);
      if (i >= 0) puddles.splice(i, 1);
    };
    puddles.push(t);
  }

  // ================= 🎃 PUMPKIN BROTHERS =================
  let littleNext = false; // spawnEnemy 入面 build／reach／init 用嚟分大佬細佬
  const pumpkinBros = {
    build: ({ seed }) => buildPumpkinBro({ seed, little: littleNext }),
    reach: () => (littleNext ? 1.7 : 2.8),
    radius: () => (littleNext ? 0.7 : 1.3),
    init(e) {
      const c = cfg('pumpkinBros');
      e.little = littleNext;
      e.throwCd = 4;
      e.rideCd = c.rideEvery ?? 14;
      e.bombCd = 2;
      if (e.little) return;
      // 大佬出嚟：順便叫細佬（同一條 HP 條）
      const grp = { title: `${c.emoji || '🎃'} ${(c.name || 'Pumpkin Brothers').toUpperCase()}`, maxHp: 0 };
      e.bossGroup = grp;
      e.bossTitle = '🎃 BIG PUMPKIN BROTHER';
      e.label?.userData.setLines([{ text: '🎃 BIG BROTHER', color: c.color || '#ff9100' }, { text: '', color: '#fff' }]);
      littleNext = true;
      let l;
      try {
        const at = clampL(e.g.position.x + 2.6, e.g.position.z + 1.2, 1.5);
        l = spawnEnemy('pumpkinBros', { boss: true, at: { x: A.x + at.x, z: A.z + at.z, glow: 0 } });
      } finally {
        littleNext = false;
      }
      l.bossGroup = grp;
      l.bossTitle = '🎃 LITTLE PUMPKIN BROTHER';
      l.hp = l.maxHp = Math.round(l.maxHp * (c.littleHp ?? 0.6));
      l.speed *= 1.35;
      l.label?.userData.setLines([{ text: '🎃 LITTLE BROTHER', color: '#ffd740' }, { text: '', color: '#fff' }]);
      l.label?.scale.multiplyScalar(0.75);
      grp.maxHp = e.maxHp + l.maxHp;
      e.partner = l;
      l.partner = e;
    },
    update(e, dt, time, o) {
      if (e.partner && !live(e.partner)) e.partner = null;
      if (e.little) littleUpdate(e, dt, time, o);
      else bigUpdate(e, dt, time, o);
    },
    onPoof(e, wp) {
      play('tbPumpkinSplit');
      const n = cfg('pumpkinBros').smallPumpkins ?? 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2 + 0.4;
        const at = clampL(wp.x - A.x + Math.cos(a) * 1.4, wp.z - A.z + Math.sin(a) * 1.4, 1);
        const s = spawnEnemy('smallPumpkin', { at: { x: A.x + at.x, z: A.z + at.z, glow: 0 } });
        s.state = 'walk';
        s.g.position.y = 0;
        s.hop = 0.45;
        s.cd = 0.8 + i * 0.15;
      }
      tell('toldSmallPumpkins', `🎃 The Pumpkin Brother burst into ${n} SMALL PUMPKINS! Poof them all!`);
      const p = e.partner;
      if (p && live(p)) {
        p.enraged = true;
        p.speed *= 1.3;
        floatText(W(p.g.position.x, p.model.userData.height + 1.4, p.g.position.z), [{ text: '😡 MY BROTHER!', color: '#ff5252' }], 1, 1.6);
        if (['held', 'riding', 'hopTo'].includes(p.state)) go(p, 'fall');
      }
    },
    remove(e) {
      if (e.partner?.partner === e) e.partner.partner = null;
      if (e.little && e.partner?.model.userData.hat) e.partner.model.userData.hat.visible = true;
    },
  };
  function bigUpdate(e, dt, time, { dx, dz, dist, face, move }) {
    const c = cfg('pumpkinBros');
    const u = e.model.userData;
    const g = e.g;
    const [nx, nz] = nrm(dx, dz, dist);
    const l = e.partner;
    e.throwCd -= dt;
    e.rideCd -= dt;
    u.carry = 0;
    switch (e.state) {
      case 'walk': {
        g.position.y = 0;
        face(dx, dz, 6);
        e.dir.set(nx, 0, nz);
        const carrying = l && l.state === 'riding';
        if (carrying) u.carry = 0.45;
        const mv = dist > e.reach * 0.85 ? 1 : 0;
        if (mv) move(nx, nz, e.speed * (carrying ? 1.3 : 1) * (e.enraged ? 1.2 : 1));
        u.animate(time, mv, 0);
        const free = l && l.state === 'walk';
        if (free && e.throwCd <= 0 && dist > 5 && dist < 22) {
          go(e, 'callBro');
          go(l, 'hopTo');
          l.hopFrom = V(l.g.position.x, 0, l.g.position.z);
          l.hopMode = 'held';
          play('tbHeyBro');
          floatText(W(g.position.x, u.height + 1.6, g.position.z), [{ text: '🎃 "Come here, little bro!"', color: '#ffd740' }], 0.9, 1.4);
        } else if (free && e.rideCd <= 0) {
          go(l, 'hopTo');
          l.hopFrom = V(l.g.position.x, 0, l.g.position.z);
          l.hopMode = 'riding';
          e.rideCd = (c.rideEvery ?? 14) + (c.rideTime ?? 8);
          play('tbHeyBro');
          floatText(W(l.g.position.x, l.model.userData.height + 1.2, l.g.position.z), [{ text: '🎃 "Piggyback!"', color: '#ffd740' }], 0.9, 1.4);
        } else if (dist < e.reach + 0.5 && e.cd <= 0) {
          meleeStart(e, { wind: 0.7, r: 2.6, fwd: 2.0, text: 'The Big Pumpkin Brother bonked you', push: 11 });
        }
        return;
      }
      case 'melee':
        u.carry = l && l.state === 'riding' ? 0.45 : 0;
        meleeUpdate(e, dt, time);
        if (e.state === 'walk') e.cd = 1.5;
        return;
      case 'callBro': { // 等細佬跳上嚟（舉高雙手）
        face(dx, dz, 6);
        u.carry = clamp01(e.t * 2);
        u.animate(time, 0, 0);
        if (!l || (l.state !== 'hopTo' && l.state !== 'held') || e.t > 2.5) { go(e, 'walk'); e.throwCd = 3; return; }
        if (l.state === 'held') {
          go(e, 'aim');
          const p = pl();
          e.throwTo = clampL(p.x, p.z, 1.5);
          e.throwWarn = warnCircle(e, e.throwTo.x, e.throwTo.z, c.throwR ?? 2.8);
          tell('toldThrow', '🎃 The Big Brother is going to THROW his little brother at you! Get out of the red circle!');
        }
        return;
      }
      case 'aim': { // 瞄準：紅圈跟住你（最後 0.4 秒唔再跟）
        const wind = e.enraged ? 0.9 : 1.15;
        const k = e.t / wind;
        u.carry = 1;
        u.animate(time, 0, 0);
        if (!l || l.state !== 'held') { if (e.throwWarn) killThing(e.throwWarn); e.throwWarn = null; go(e, 'walk'); return; }
        if (e.t < wind - 0.4) {
          const p = pl();
          const to = clampL(p.x, p.z, 1.5);
          e.throwTo.lerp(to, Math.min(1, dt * 6));
          e.throwWarn.obj.position.set(e.throwTo.x, 0.07, e.throwTo.z);
        }
        face(e.throwTo.x - g.position.x, e.throwTo.z - g.position.z, 8);
        e.throwWarn.set(k * 0.7, time);
        if (k >= 1) {
          // 掟！細佬變成一嚿飛過去
          l.flyFrom = V(l.g.position.x, l.g.position.y, l.g.position.z);
          l.flyTo = e.throwTo.clone();
          l.flyWarn = e.throwWarn;
          e.throwWarn = null;
          l.flyWarn.owner = l;
          go(l, 'thrown');
          play('tbThrow');
          e.throwCd = (c.throwEvery ?? 8) * (e.enraged ? 0.7 : 1);
          go(e, 'throwRec');
        }
        return;
      }
      case 'throwRec': {
        u.animate(time, 0, Math.min(1, 0.6 + e.t));
        if (e.t > 0.7) go(e, 'walk');
        return;
      }
      default: go(e, 'walk');
    }
  }
  function littleUpdate(e, dt, time, { dx, dz, dist, face, move }) {
    const c = cfg('pumpkinBros');
    const u = e.model.userData;
    const g = e.g;
    const [nx, nz] = nrm(dx, dz, dist);
    const b = e.partner;
    u.ball = 0;
    const onBig = (lift) => { // 喺大佬上面（同一個 x/z：唔會俾「互相推開」推走）
      g.position.set(b.g.position.x, b.model.userData.height * lift, b.g.position.z);
      g.rotation.y = b.g.rotation.y;
    };
    const rideY = () => (b ? b.model.userData.headTop - u.hipY + 0.05 : 0); // 坐喺大佬個南瓜頭上面
    const hat = (v) => { if (b?.model.userData.hat) b.model.userData.hat.visible = v; };
    u.sit = 0;
    switch (e.state) {
      case 'walk': {
        g.position.y = 0;
        face(dx, dz, 8);
        e.dir.set(nx, 0, nz);
        const mv = dist > e.reach * 0.85 ? 1 : 0;
        if (mv) move(nx, nz, e.speed);
        u.animate(time, mv, 0);
        if (dist < e.reach + 0.4 && e.cd <= 0) meleeStart(e, { wind: 0.5, r: 1.7, fwd: 1.2, text: 'The Little Pumpkin Brother kicked your shin', push: 7 });
        return;
      }
      case 'melee':
        meleeUpdate(e, dt, time);
        if (e.state === 'walk') e.cd = 1.1;
        return;
      case 'hopTo': { // 跳去大佬度（舉高 = held，膊頭 = riding）
        if (!b) { go(e, 'fall'); return; }
        const k = clamp01(e.t / 0.6);
        const to = V(b.g.position.x, e.hopMode === 'held' ? b.model.userData.height * 0.92 : rideY(), b.g.position.z);
        if (e.hopMode === 'riding' && k > 0.5) { hat(false); u.sit = 1; }
        const v = arc(e.hopFrom, to, 2.5, k, V());
        g.position.copy(v);
        u.ball = e.hopMode === 'held' ? k : 0;
        u.animate(time, 0, 0);
        if (e.t < dt * 1.5) play('tbHop');
        if (k >= 1) {
          go(e, e.hopMode);
          e.bombCd = 1.5;
        }
        return;
      }
      case 'held': { // 俾大佬舉高（縮埋一嚿轉轉下）
        if (!b || !['callBro', 'aim'].includes(b.state)) { go(e, 'fall'); return; }
        onBig(0.92);
        u.ball = 1;
        e.model.rotation.x = Math.sin(time * 12) * 0.15;
        u.animate(time, 0, 0);
        return;
      }
      case 'thrown': { // 飛過嚟！落地：震波 + 圈入面扣心
        const dur = 0.9;
        const k = clamp01(e.t / dur);
        arc(e.flyFrom, V(e.flyTo.x, 0, e.flyTo.z), 5.5, k, g.position);
        u.ball = 1;
        e.model.rotation.x -= dt * 14;
        u.animate(time, 0, 0);
        e.flyWarn?.set(0.7 + k * 0.3, time);
        if (k >= 1) {
          g.position.y = 0;
          e.model.rotation.x = 0;
          if (e.flyWarn) killThing(e.flyWarn);
          e.flyWarn = null;
          play('leapLand');
          K.addShake(0.4);
          const r = c.throwR ?? 2.8;
          sparkle(W(g.position.x, 0.4, g.position.z), 0xff9100, 22, 5, 0.6, 0.7);
          K.shockwave(e, c.throwWave ?? 8);
          const p = pl();
          const pdx = p.x - g.position.x;
          const pdz = p.z - g.position.z;
          const pd = Math.max(0.1, Math.hypot(pdx, pdz));
          if (pd < r + 0.3 && K.player.feetY < 1.4) hitPlayer('The Little Pumpkin Brother was THROWN at you', { x: (pdx / pd) * 11, y: 6, z: (pdz / pd) * 11 });
          go(e, 'dizzy');
          floatText(W(g.position.x, 2.2, g.position.z), [{ text: '💫 Ouch!', color: '#ffd740' }], 0.8, 1);
        }
        return;
      }
      case 'riding': { // 騎膊馬：喺上面掟南瓜炸彈
        if (!b) { go(e, 'fall'); return; }
        g.position.set(b.g.position.x, rideY() + Math.abs(Math.sin(time * 7)) * 0.08, b.g.position.z);
        g.rotation.y = b.g.rotation.y;
        hat(false);
        u.sit = 1;
        u.animate(time, 0, 0);
        u.ball = 0;
        e.bombCd -= dt;
        if (e.bombCd <= 0 && dist < 22) {
          K.throwBomb(e);
          e.bombCd = 2.3;
        }
        if (e.t > (c.rideTime ?? 8) || (b.state !== 'walk' && b.state !== 'melee')) {
          hat(true);
          go(e, 'hopOff');
          e.hopFrom = V(g.position.x, g.position.y, g.position.z);
          const side = V(-b.dir.z, 0, b.dir.x);
          e.hopTo = clampL(g.position.x + side.x * 2.6, g.position.z + side.z * 2.6, 1.2);
        }
        return;
      }
      case 'hopOff':
      case 'fall': {
        if (e.state === 'fall' && !e.hopTo) {
          e.hopFrom = V(g.position.x, g.position.y, g.position.z);
          e.hopTo = clampL(g.position.x + rand(-1.5, 1.5), g.position.z + rand(-1.5, 1.5), 1.2);
        }
        const k = clamp01(e.t / 0.55);
        arc(e.hopFrom, e.hopTo, 1.6, k, g.position);
        e.model.rotation.x = 0;
        u.animate(time, 0, 0);
        if (k >= 1) {
          g.position.y = 0;
          e.hopTo = null;
          e.cd = 0.8;
          go(e, 'walk');
        }
        return;
      }
      case 'dizzy': {
        u.animate(time, 0, 0);
        g.rotation.z = Math.sin(e.t * 12) * 0.1;
        if (e.t > 1.3) {
          g.rotation.z = 0;
          go(e, 'walk');
        }
        return;
      }
      default: go(e, 'walk');
    }
  }
  // 🎃 細南瓜：彈下彈下過嚟撞你
  const smallPumpkin = {
    build: ({ seed }) => buildSmallPumpkin({ seed }),
    reach: 1.1,
    radius: 0.45,
    update(e, dt, time, { dx, dz, dist, face }) {
      const u = e.model.userData;
      const g = e.g;
      const [nx, nz] = nrm(dx, dz, dist);
      e.hopT = (e.hopT ?? Math.random() * 0.5) + dt;
      const T = 0.62;
      const k = (e.hopT % T) / T;
      if (k < 0.25) { // 壓扁準備跳
        u.squash = k / 0.25;
        g.position.y = 0;
        e.hopDir = V(nx, 0, nz);
      } else {
        u.squash = 0;
        const kk = (k - 0.25) / 0.75;
        g.position.y = Math.sin(kk * PI) * 0.7;
        const d = e.hopDir || V(nx, 0, nz);
        if (dist > 0.6) {
          g.position.x += d.x * e.speed * 1.3 * dt;
          g.position.z += d.z * e.speed * 1.3 * dt;
          const cl = clampL(g.position.x, g.position.z, e.radius + 0.4);
          g.position.x = cl.x;
          g.position.z = cl.z;
        }
        if (kk < 0.08 && e.lastHop !== Math.floor(e.hopT / T)) {
          e.lastHop = Math.floor(e.hopT / T);
          if (dist < 14) play('tbHop');
        }
      }
      face(dx, dz, 10);
      u.animate(time, 1, 0);
      if (dist < e.reach && e.cd <= 0 && K.player.feetY < 1.2) {
        e.cd = 1.4;
        hitPlayer('A small pumpkin bonked you', { x: nx * 6, y: 4, z: nz * 6 });
      }
    },
  };

  // ================= 👻 BANSHEE QUEEN =================
  const banshee = {
    build: ({ seed }) => buildBanshee({ seed }),
    reach: 2.4,
    radius: 1.1,
    flying: true,
    init(e) {
      e.screamCd = 3.5;
      e.trickCd = 9;
      e.side = Math.random() < 0.5 ? 1 : -1;
      e.alpha = 1;
    },
    onHit(e, dmg) {
      if (e.alpha < 0.4) return false; // 隱咗身：打唔中
      return dmg;
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const c = cfg('banshee');
      const u = e.model.userData;
      const g = e.g;
      const [nx, nz] = nrm(dx, dz, dist);
      e.screamCd -= dt;
      e.trickCd -= dt;
      u.scream = 0;
      switch (e.state) {
        case 'walk': {
          face(dx, dz, 5);
          ghostDrift(e, dt, dist, nx, nz, move, 6, 11);
          u.animate(time, 0.6, 0);
          if (e.trickCd <= 0) {
            go(e, 'vanish');
            play('tbVanish');
          } else if (e.screamCd <= 0 && dist < (c.screamLen ?? 17) - 2) {
            go(e, 'screamWind');
            e.dir.set(nx, 0, nz);
            e.cone = warnCone(e, c.screamLen ?? 17, ((c.screamAngle ?? 70) * PI) / 360);
            play('tbScreamCharge');
            tell('toldScream', '👻 The Banshee Queen is going to SCREAM! Get OUT of the red cone!');
          } else if (dist < e.reach + 0.4 && e.cd <= 0) {
            e.dir.set(nx, 0, nz);
            meleeStart(e, { wind: 0.6, r: 2.2, fwd: 1.8, text: 'The Banshee Queen touched you with her icy hand', push: 9 });
          }
          return;
        }
        case 'melee':
          meleeUpdate(e, dt, time);
          if (e.state === 'walk') e.cd = 1.6;
          return;
        case 'screamWind': { // 扇形警告：頭 0.5 秒跟住你，之後鎖定
          const wind = c.screamWind ?? 1.3;
          const k = e.t / wind;
          if (e.t < 0.5) e.dir.set(nx, 0, nz);
          face(e.dir.x, e.dir.z, 10);
          e.cone.aim(g.position.x, g.position.z, e.dir.x, e.dir.z);
          e.cone.set(k, time);
          u.scream = k * 0.45;
          u.animate(time, 0, 0);
          if (k >= 1) {
            go(e, 'scream');
            play('tbScream');
            K.addShake(0.35);
            screamRings(e);
            // 喺扇形入面 = 中
            const p = pl();
            const pdx = p.x - g.position.x;
            const pdz = p.z - g.position.z;
            const pd = Math.hypot(pdx, pdz);
            const half = ((c.screamAngle ?? 70) * PI) / 360;
            const ang = Math.acos(Math.max(-1, Math.min(1, (pdx * e.dir.x + pdz * e.dir.z) / Math.max(0.01, pd))));
            if (pd < (c.screamLen ?? 17) + 0.4 && (ang < half + 0.05 || pd < 1.5)) {
              hitPlayer("The Banshee Queen's SCREAM blasted you", { x: e.dir.x * 16, y: 5, z: e.dir.z * 16 });
            }
            killThing(e.cone);
            e.cone = null;
          }
          return;
        }
        case 'scream': {
          u.scream = 1;
          face(e.dir.x, e.dir.z, 10);
          u.animate(time, 0, 0);
          if (e.t > 0.7) {
            e.screamCd = (c.screamEvery ?? 6.5) / Math.sqrt(K.speedMul(R.floor));
            go(e, 'walk');
          }
          return;
        }
        case 'vanish': { // 閃一閃 → 隱身 → 瞬移 + 假分身
          const k = clamp01(e.t / 0.7);
          e.alpha = (1 - k) * (0.6 + Math.abs(Math.sin(e.t * 30)) * 0.4);
          u.setAlpha(e.alpha);
          u.animate(time, 0, 0);
          if (Math.random() < dt * 20) sparkle(W(g.position.x + rand(-1, 1), rand(1, 4), g.position.z + rand(-1, 1)), 0x84ffff, 1, 1.5, 0.6, 0.5);
          if (k >= 1) {
            const p = pl();
            const n = e.hp < e.maxHp * 0.5 ? (c.copiesLow ?? 3) : (c.copies ?? 2);
            const a0 = Math.random() * PI * 2;
            const spots = [];
            for (let i = 0; i <= n; i++) {
              const a = a0 + (i / (n + 1)) * PI * 2;
              spots.push(clampL(p.x + Math.cos(a) * rand(8, 11), p.z + Math.sin(a) * rand(8, 11), 2));
            }
            const me = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
            g.position.set(me.x, 0, me.z);
            for (const s of spots) {
              if (K.alive().length >= K.maxAtOnce + 4) break;
              const f = spawnEnemy('bansheeCopy', { at: { x: A.x + s.x, z: A.z + s.z, glow: 0 } });
              f.state = 'appear';
              f.g.position.y = 0;
              f.model.userData.setAlpha(0);
            }
            go(e, 'appear');
            e.trickCd = c.trickEvery ?? 13;
            e.screamCd = Math.max(e.screamCd, 2.2);
            tell('toldFakes', '👻 The Banshee Queen made FAKE copies! Fakes go POOF in one hit. Only the REAL queen loses health!');
          }
          return;
        }
        case 'appear': {
          const k = clamp01(e.t / 0.6);
          e.alpha = k;
          u.setAlpha(k);
          face(dx, dz, 5);
          u.animate(time, 0, 0);
          if (k >= 1) go(e, 'walk');
          return;
        }
        default: go(e, 'walk');
      }
    },
    onPoof() { // 真嘅打散：假分身全部散
      for (const f of K.enemies.filter((o) => o.kind === 'bansheeCopy' && o.state !== 'poof')) fakeVanish(f);
    },
    remove(e) {
      if (e.cone) killThing(e.cone);
      e.cone = null;
    },
  };
  // 鬼魂飄：保持距離（near–far）+ 側身慢慢繞住你
  function ghostDrift(e, dt, dist, nx, nz, move, near, far) {
    const want = dist > far ? 1 : dist < near ? -0.7 : 0;
    if (Math.random() < dt * 0.25) e.side = -e.side;
    move(nx * want - nz * e.side * 0.45, nz * want + nx * e.side * 0.45, e.speed);
  }
  // 🔊 SCREAM：一圈圈直企嘅聲波，沿住扇形飛出去（越飛越大）
  function screamRings(e) {
    const g = e.g.position;
    const c = cfg('banshee');
    const len = c.screamLen ?? 17;
    const spread = Math.tan(((c.screamAngle ?? 70) * PI) / 360);
    const dir = e.dir.clone();
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 36), ADDM(i % 2 ? 0xffffff : 0x84ffff, 0.9));
      m.rotation.y = Math.atan2(dir.x, dir.z);
      m.position.set(g.x, 2.2, g.z);
      const delay = i * 0.09;
      addThing({
        obj: m, life: 0.7 + delay,
        update: (dt, time, t) => {
          const k = clamp01((t.t - delay) / 0.6);
          const d = 1 + k * len;
          m.position.set(g.x + dir.x * d, 2.2 - k * 1.2, g.z + dir.z * d);
          m.scale.setScalar(Math.max(0.6, d * spread * 0.8));
          m.material.opacity = t.t < delay ? 0 : 0.85 * (1 - k * k);
          return false;
        },
      });
    }
  }
  function fakeVanish(f) {
    const p = f.g.position;
    sparkle(W(p.x, 2.5, p.z), 0x84ffff, 18, 3, 0.7, 0.6);
    puff(p.x, 2, p.z, 0xb2ebf2, 2.2, 0.7, 5, 1);
    play('tbFake');
    removeEnemy(f);
  }
  // 👻 假分身：一 hit 就散；飄近你，太近 =「BOO!」散咗（唔扣心）
  const bansheeCopy = {
    build: ({ seed }) => buildBanshee({ seed: seed + 3, copy: true }),
    reach: 2.0,
    radius: 1.1,
    flying: true,
    init(e) {
      e.life = cfg('banshee').copyLife ?? 12;
      e.side = Math.random() < 0.5 ? 1 : -1;
      e.bar?.g.removeFromParent(); // 假嘅冇自己 HP 條：同真嘅一模一樣（真嘅先會扣 Boss HP 條）
      const b = TOWER_BOSSES.banshee || {};
      e.label = makeLabel([{ text: `${b.emoji || '👻'} ${(b.name || 'Banshee Queen').toUpperCase()}`, color: b.color || '#84ffff' }, { text: '', color: '#fff' }], 1.6);
      e.label.position.y = e.model.userData.height + 1.2;
      e.g.add(e.label);
    },
    onHit(e, dmg, info) {
      if (info.angryHit) return false;
      if (!R.run?.toldFake) {
        if (R.run) R.run.toldFake = true;
        floatText(W(e.g.position.x, 4, e.g.position.z), [{ text: '👻 FAKE!', color: '#84ffff' }], 1.2, 1.2);
      }
      play('tbFake');
      return e.hp + 1;
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const u = e.model.userData;
      const [nx, nz] = nrm(dx, dz, dist);
      e.life -= dt;
      if (e.state === 'appear') {
        const k = clamp01(e.t / 0.6);
        u.setAlpha(k);
        face(dx, dz, 5);
        u.animate(time, 0, 0);
        if (k >= 1) go(e, 'walk');
        return;
      }
      if (e.life <= 0) { fakeVanish(e); return; }
      face(dx, dz, 5);
      ghostDrift(e, dt, dist, nx, nz, move, 2, 9);
      u.animate(time, 0.6, 0);
      if (dist < 2.2) { // BOO! 推開你少少，唔扣心
        R.knock.set(nx * 7, 0, nz * 7);
        floatText(W(e.g.position.x, 3.5, e.g.position.z), [{ text: '👻 BOO! A fake!', color: '#84ffff' }], 1, 1.2);
        fakeVanish(e);
      }
    },
  };

  // ================= 每格 + 清場 =================
  function update(dt, time) {
    for (const t of [...things]) {
      if (!things.includes(t)) continue;
      t.t += dt;
      if (t.update?.(dt, time, t) || (t.life && t.t >= t.life)) killThing(t);
    }
    updateDust(dt);
  }
  function clear() {
    for (const t of [...things]) killThing(t);
    dustT = 0;
    dustK = 0;
    if (dustUi) dustUi.style.opacity = '0';
    littleNext = false;
  }

  return {
    bosses: { rider, witch, vampiro, pumpkinBros, banshee },
    kinds: { riderZombie: { build: ({ seed }) => buildRiderZombie({ seed }), reach: 1.8, radius: 0.65 }, dustler, smallPumpkin, bansheeCopy },
    update,
    clear,
  };
}
