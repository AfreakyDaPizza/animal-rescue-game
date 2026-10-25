// 🧩 Witch Tower 擴充（Issue #15）—— API 見 witchTower.js「擴充 API」
// 小朋友 2026-10-25：「flying bats which when killed zombies near it for 10 seconds will be faster and deal 2 hearts」
//                    「add more zombie types like the zombie leader, draculo, zombie balloon which drops bombs, zombie cannon」
// 5 款新殭屍（模型喺 src/towerModels2.js，數值喺 balance.js TOWER_ENEMIES）：
//   🦇 bat      一群 2–3 隻喺頭頂兜圈，地上紅圈 = 會俯衝落嚟咬你。打散一隻 → 附近 buffRange 米嘅殭屍 buffTime 秒：快 1.5 倍 + 打中扣 2 ❤️
//   🚩 leader   大隻殭屍；每幾秒吹號角（金色光圈）→ 附近殭屍快啲（rallySpeed）一陣；近身會打
//   🧛 draculo  變蝙蝠霧（打唔中）→ 紅色記號 0.65 秒後喺你隔籬出返嚟 → 紅色扇形 = 披風掃；掃中你就醫返自己少少
//   🎈 balloon  吊喺氣球下面飄喺半空，跌南瓜炸彈（紅圈）；打爆 4 個氣球（或者 HP 低過 popAt）就跌落地，暈一陣再慢慢行
//   💥 cannon   推住大炮企遠遠：紅線 + 大紅圈 = 炮彈會落嘅位（爆炸好大）；轉身好慢 → 跑去佢側邊！
// 測試：game.tower.only('bat', 1, 8)、game.tower.lineup(true, ['bat','leader','draculo','balloon','cannon'])
import * as THREE from 'three';
import { buildBat, buildLeader, buildDraculo, buildBalloon, buildCannon, buildCannonball } from './towerModels2.js';
import { projectileModel } from './weaponModels.js';
import { towerGlowTex } from './towerModels.js';
import { addSounds } from './sound.js';
import { TOWER_ENEMIES } from './data/balance.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

addSounds({
  batScreech: (t, { tone }) => {
    tone(2600, t, 0.12, { type: 'square', vol: 0.025, slide: 1.4 });
    tone(3100, t + 0.09, 0.1, { type: 'square', vol: 0.02, slide: 0.7 });
  },
  batBuff: (t, { tone, arp }) => {
    arp(t, [880, 740, 587, 440], 0.05, { type: 'sawtooth', vol: 0.05 });
    tone(110, t, 0.5, { type: 'square', vol: 0.05, slide: 1.6 });
  },
  hornBlow: (t, { tone }) => {
    tone(196, t, 1.0, { type: 'sawtooth', vol: 0.09, slide: 1.06 });
    tone(294, t + 0.05, 0.95, { type: 'triangle', vol: 0.08, slide: 1.04 });
    tone(98, t, 1.0, { type: 'sine', vol: 0.12 });
  },
  mistPoof: (t, { tone, noise }) => {
    noise(t, 0.45, { vol: 0.22, freq: 1400, q: 0.6, type: 'bandpass' });
    tone(700, t, 0.35, { type: 'triangle', vol: 0.06, slide: 0.4 });
  },
  mistAppear: (t, { tone, noise }) => {
    noise(t, 0.3, { vol: 0.2, freq: 900, q: 0.6, type: 'bandpass' });
    tone(260, t, 0.3, { type: 'triangle', vol: 0.08, slide: 2.4 });
  },
  capeSwish: (t, { noise }) => noise(t, 0.28, { vol: 0.3, freq: 900, q: 0.7, type: 'bandpass' }),
  balloonPop: (t, { tone, noise }) => {
    noise(t, 0.08, { vol: 0.45, freq: 3000, type: 'highpass' });
    tone(900, t, 0.06, { type: 'square', vol: 0.06, slide: 0.5 });
  },
  balloonFall: (t, { tone }) => tone(900, t, 0.9, { type: 'sine', vol: 0.07, slide: 0.25 }),
  cannonFire: (t, { tone, noise }) => {
    tone(55, t, 0.8, { type: 'sine', vol: 0.55, slide: 0.45 });
    noise(t, 0.55, { vol: 0.55, freq: 320 });
  },
  cannonBoom: (t, { tone, noise, arp }) => {
    tone(45, t, 1.0, { type: 'sine', vol: 0.6, slide: 0.4 });
    noise(t, 0.9, { vol: 0.6, freq: 260 });
    arp(t + 0.12, [784, 1047, 1319, 1568], 0.05, { type: 'triangle', vol: 0.06 });
  },
});

export function installTowerZombies(K) {
  const { A, R } = K;
  const stat = (kind) => TOWER_ENEMIES[kind] || {};
  const told = (key, msg) => {
    if (R.run && !R.run[key]) {
      R.run[key] = true;
      K.popup(msg);
    }
  };
  const P = () => { // 玩家（相對 arena）
    const p = K.playerPos();
    return { x: p.x - A.x, z: p.z - A.z, feet: K.player.feetY };
  };
  const W = (x, y, z) => V(A.x + x, y, A.z + z); // 相對 → 世界
  const clampLocal = (x, z, m = 1.2) => {
    const t = K.tmp.set(A.x + x, 0, A.z + z);
    K.clampTower(t, m);
    return { x: t.x - A.x, z: t.z - A.z };
  };
  const fwdOf = (g) => ({ x: -Math.sin(g.rotation.y), z: -Math.cos(g.rotation.y) });
  // 慢慢轉（最多 rate 弧度／秒）→ 大炮轉身慢，可以繞去側邊
  const turnTo = (g, x, z, rate, dt) => {
    const want = Math.atan2(-x, -z);
    let d = want - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += clamp(d, -rate * dt, rate * dt);
    return Math.abs(d);
  };
  const mine = new Set(); // 我哋嘅敵人（打散時喺半空 → 保持高度）
  const ownMeshes = new Set(); // 加咗入 arena 嘅警告 mesh（清場時一齊清）
  const addMesh = (m) => {
    K.arena.g.add(m);
    ownMeshes.add(m);
    return m;
  };
  const dropMesh = (m) => {
    if (!m) return null;
    m.removeFromParent();
    ownMeshes.delete(m);
    m.traverse((o) => {
      if (o.geometry && !o.isSprite) o.geometry.dispose(); // Sprite 共用 geometry：唔好清
      if (o.material) o.material.dispose();
    });
    return null;
  };
  const groundCircle = (r, color = 0xff1744) => {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 40), K.ADDM(color, 0));
    const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.16, r, 40), K.ADDM(0xff5252, 0.9));
    fill.rotation.x = edge.rotation.x = -PI / 2;
    edge.position.y = 0.01;
    g.add(fill, edge);
    g.userData.fill = fill;
    g.userData.edge = edge;
    return g;
  };
  // 一個圈喺地上散開（光圈）
  const pulseRing = (x, z, maxR, color, life = 0.6, y = 0.12) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), K.ADDM(color, 0.9));
    ring.rotation.x = -PI / 2;
    ring.position.set(x, y, z);
    K.particle(ring, { life, grav: 0, shrink: false, fade: (o, k) => { o.scale.setScalar(0.5 + maxR * (1 - k)); o.material.opacity = k * 0.9; } });
    rings.push(ring);
  };
  const rings = []; // 散開嘅光圈：粒子系統拎走咗（冇 parent）就清
  const later = []; // { t 秒後, fn }
  function updateRings(dt) {
    for (let i = rings.length - 1; i >= 0; i--) {
      if (rings[i].parent) continue;
      rings[i].geometry.dispose();
      rings[i].material.dispose();
      rings.splice(i, 1);
    }
    for (let i = later.length - 1; i >= 0; i--) {
      later[i].t -= dt;
      if (later[i].t <= 0) later.splice(i, 1)[0].fn();
    }
  }
  const others = (e, range, rising = false) => K.alive().filter((o) => o !== e && !o.isAnimal && (rising || o.state !== 'rise') && Math.hypot(o.g.position.x - e.g.position.x, o.g.position.z - e.g.position.z) < range);
  const hOf = (o) => (o.isAnimal ? o.size.y : o.model.userData.height);

  // ================= 💣 拋／跌落嚟嘅炮彈（地上紅圈 = 會爆嘅範圍）=================
  const lobs = [];
  function lob({ model, from, to, dur, arc = 0, fall = false, radius, msg, push = 8, boom = 'bombBoom', owner = null, big = 1 }) {
    const sg = new THREE.Group();
    sg.add(model);
    sg.position.copy(from);
    K.arena.g.add(sg);
    const warn = addMesh(groundCircle(radius));
    warn.position.set(to.x, 0.07, to.z);
    lobs.push({ sg, model, from, to, dur, arc, fall, radius, msg, push, boom, owner, big, warn, t: 0 });
  }
  function updateLobs(dt, time) {
    const pp = P();
    for (let i = lobs.length - 1; i >= 0; i--) {
      const s = lobs[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const kk = s.fall ? k * k : k; // 跌落嚟：越跌越快
      s.sg.position.lerpVectors(s.from, s.to, kk);
      s.sg.position.y += Math.sin(k * PI) * s.arc;
      s.model.userData.fly?.(null, time, dt);
      s.warn.userData.fill.material.opacity = 0.12 + k * k * 0.45 + (k > 0.7 ? Math.sin(s.t * 30) * 0.08 : 0);
      s.warn.userData.edge.scale.setScalar(1.15 - k * 0.15);
      if (k < 1) continue;
      K.play(s.boom);
      K.addShake(0.3 * s.big);
      const wp = W(s.to.x, 0.6, s.to.z);
      K.candyBurst(wp, Math.round(20 * s.big), s.big);
      K.sparkle(wp, 0xff9100, Math.round(24 * s.big), 6 * s.big, 0.6, 0.9);
      K.sparkle(wp, 0xffeb3b, 12, 4, 0.5, 0.6);
      pulseRing(s.to.x, s.to.z, s.radius * 1.1, 0xff9100, 0.4);
      const dx = pp.x - s.to.x;
      const dz = pp.z - s.to.z;
      const d = Math.hypot(dx, dz);
      if (d < s.radius && pp.feet < 2.2) K.hitPlayer(s.msg, { x: (dx / Math.max(0.1, d)) * s.push, y: 6, z: (dz / Math.max(0.1, d)) * s.push });
      removeLob(s);
      lobs.splice(i, 1);
    }
  }
  function removeLob(s) {
    s.sg.removeFromParent();
    s.model.userData.dispose?.();
    dropMesh(s.warn);
  }

  // ================= 🦇 Vampire Bat =================
  const bat = {
    flying: true,
    radius: 0.45,
    reach: 1,
    build: ({ seed }) => buildBat({ seed }),
    init(e) {
      mine.add(e);
      e.alt = rand(2.4, 3.4); // 飛幾高（身喺 g 上面 0.9 米）
      e.orbA = Math.random() * PI * 2;
      e.orbR = rand(4.5, 6.5);
      e.spin = Math.random() < 0.5 ? 1 : -1;
      e.cd = rand(1.5, 3);
    },
    update(e, dt, time, { dist, face }) {
      const g = e.g;
      const u = e.model.userData;
      const d = stat('bat');
      // 一群出嚟：第一次郁先叫埋朋友（每次排隊揀中蝙蝠 = 2–3 隻）
      if (!e.packDone) {
        e.packDone = true;
        const [lo, hi] = d.pack || [2, 3];
        const n = Math.round(rand(lo, hi)) - 1;
        for (let i = 0; i < n && K.alive().length < K.maxAtOnce + 3; i++) {
          const a = Math.random() * PI * 2;
          const at = clampLocal(g.position.x + Math.cos(a) * 1.6, g.position.z + Math.sin(a) * 1.6, 1.5);
          const b = K.spawnEnemy('bat', { at: { x: A.x + at.x, z: A.z + at.z, glow: 0 } });
          b.packDone = true;
        }
        if (n > 0 && R.run && !R.run.toldBatPack) {
          told('toldBatPack', '🦇 Vampire Bats! They swoop at the RED circle. Careful: poof one and the zombies NEAR it get super strong for 10 seconds!');
        }
      }
      const pp = P();
      e.lastY = g.position.y;
      switch (e.state) {
        case 'walk': { // 喺你頭頂兜圈
          e.orbA += (dt * e.spin * e.speed * 0.6) / e.orbR;
          const tx = pp.x + Math.cos(e.orbA) * e.orbR;
          const tz = pp.z + Math.sin(e.orbA) * e.orbR;
          const vx = tx - g.position.x;
          const vz = tz - g.position.z;
          const vd = Math.hypot(vx, vz) || 1;
          const sp = Math.min(e.speed, vd * 3);
          g.position.x += (vx / vd) * sp * dt;
          g.position.z += (vz / vd) * sp * dt;
          const c = clampLocal(g.position.x, g.position.z, 1.2);
          g.position.x = c.x;
          g.position.z = c.z;
          g.position.y += (e.alt + Math.sin(time * 3 + e.orbA) * 0.3 - g.position.y) * Math.min(1, dt * 3);
          face(vx, vz, 8);
          u.animate(time, 1, 0);
          if (e.cd <= 0 && dist < 15 && g.position.y > e.alt - 0.8) {
            e.state = 'windup';
            e.t = 0;
            e.warn ||= addMesh(groundCircle(1.1));
            e.warn.visible = true;
            K.play('batScreech');
          }
          return;
        }
        case 'windup': { // 停喺半空、升高少少、尖叫；地上紅圈跟住你
          face(pp.x - g.position.x, pp.z - g.position.z, 10);
          g.position.y += (e.alt + 0.7 - g.position.y) * Math.min(1, dt * 5);
          u.animate(time, 1.4, Math.min(0.5, e.t));
          e.warn.position.set(pp.x, 0.07, pp.z);
          e.warn.userData.fill.material.opacity = 0.15 + e.t * 0.5 + Math.sin(e.t * 30) * 0.06;
          if (e.t >= 0.65) {
            // 鎖定：由而家個位 → 經過你（高度到心口）→ 飛過咗再升返上去
            e.state = 'swoop';
            e.t = 0;
            e.bit = false;
            const sx = g.position.x;
            const sz = g.position.z;
            const ddx = pp.x - sx;
            const ddz = pp.z - sz;
            const dd = Math.hypot(ddx, ddz) || 1;
            const end = clampLocal(pp.x + (ddx / dd) * 4.5, pp.z + (ddz / dd) * 4.5, 1.5);
            e.sw = { p0: V(sx, g.position.y, sz), mid: V(pp.x, pp.feet + 0.55, pp.z), p2: V(end.x, e.alt, end.z) };
            e.swDur = clamp((dd + 4.5) / (e.speed * 1.9), 0.6, 1.6);
            K.play('batScreech');
          }
          return;
        }
        case 'swoop': { // 俯衝（彎彎咁）：經過紅圈嘅位
          const k = Math.min(1, e.t / e.swDur);
          const { p0, mid, p2 } = e.sw;
          // 二次 Bezier：k = 0.5 啱啱經過 mid
          const cx = 2 * mid.x - (p0.x + p2.x) / 2;
          const cy = 2 * mid.y - (p0.y + p2.y) / 2;
          const cz = 2 * mid.z - (p0.z + p2.z) / 2;
          const a = (1 - k) * (1 - k);
          const b = 2 * (1 - k) * k;
          const c = k * k;
          const nx = a * p0.x + b * cx + c * p2.x;
          const nz = a * p0.z + b * cz + c * p2.z;
          face(nx - g.position.x, nz - g.position.z, 14);
          g.position.set(nx, Math.max(0.2, a * p0.y + b * cy + c * p2.y), nz);
          u.animate(time, 1, 1 - Math.abs(k - 0.5) * 1.2);
          if (e.warn) e.warn.userData.fill.material.opacity = Math.max(0, 0.45 - k * 0.6);
          if (!e.bit) {
            const hd = Math.hypot(pp.x - g.position.x, pp.z - g.position.z);
            const bodyY = g.position.y + 0.9;
            if (hd < 1.0 && Math.abs(bodyY - (pp.feet + 1.0)) < 1.1) {
              e.bit = true;
              K.hitPlayer('A Vampire Bat bit you', { x: ((pp.x - g.position.x) / Math.max(0.1, hd)) * 4, y: 3, z: ((pp.z - g.position.z) / Math.max(0.1, hd)) * 4 });
            }
          }
          if (k >= 1) {
            if (e.warn) e.warn.visible = false;
            e.state = 'walk';
            e.t = 0;
            e.orbA = Math.atan2(g.position.z - pp.z, g.position.x - pp.x);
            e.cd = rand(2.6, 4.2) / Math.sqrt(K.speedMul(R.floor));
          }
          return;
        }
        default:
          e.state = 'walk';
      }
    },
    onPoof(e, wp) {
      const d = stat('bat');
      const y = (e.lastY ?? e.g.position.y) + 0.9;
      K.candyBurst(V(wp.x, y, wp.z), 12, 0.7);
      // 🦇 附近嘅殭屍：快 1.5 倍 + 打中扣 2 ❤️（10 秒）
      const range = d.buffRange ?? 6;
      const list = others(e, range, true).filter((o) => !o.boss);
      pulseRing(e.g.position.x, e.g.position.z, range, 0xff1744, 0.7);
      if (!list.length) return;
      K.play('batBuff');
      for (const o of list) {
        K.buffEnemy(o, { time: d.buffTime ?? 10, speed: 1.5, hearts: 1, color: 0xff1744 });
        o.flashT = 0.14;
        const h = hOf(o);
        K.sparkle(W(o.g.position.x, o.g.position.y + h * 0.6, o.g.position.z), 0xff1744, 14, 3, 0.7, 0.6);
        K.floatText(W(o.g.position.x, o.g.position.y + h + 1.0, o.g.position.z), [{ text: '🦇 FAST! 2 ❤️', color: '#ff5252' }], 0.7, 1.3);
      }
      told('toldBatBuff', `🦇 You poofed a Vampire Bat near ${list.length === 1 ? 'a zombie' : `${list.length} zombies`}! For ${d.buffTime ?? 10} seconds they are FAST and hit for 2 ❤️ — run!`);
    },
    remove(e) {
      mine.delete(e);
      e.warn = dropMesh(e.warn);
    },
  };

  // ================= 🚩 Zombie Leader =================
  const leader = {
    radius: 0.8,
    reach: 1.8,
    build: ({ seed }) => buildLeader({ seed }),
    init(e) {
      mine.add(e);
      e.rallyT = rand(3, 5);
    },
    update(e, dt, time, o) {
      const u = e.model.userData;
      const d = stat('leader');
      if (e.state === 'rally') { // 📯 吹號角：金色光圈 → 附近殭屍快啲
        o.face(o.dx, o.dz, 3);
        u.rally = Math.min(1, e.t / 0.35);
        u.animate(time, 0, 0);
        if (!e.blown && e.t >= 0.45) {
          e.blown = true;
          const range = d.rallyRange ?? 9;
          for (let i = 0; i < 3; i++) later.push({ t: i * 0.22, fn: () => e.hp > 0 && pulseRing(e.g.position.x, e.g.position.z, range, 0xffd740, 0.8, 0.14 + i * 0.02) });
          K.sparkle(W(e.g.position.x, hOf(e) * 0.85, e.g.position.z), 0xffd740, 18, 3.5, 0.8, 0.6);
          let n = 0;
          for (const f of others(e, range)) {
            if (f.buffT > 0 && (f.buff?.hearts || 0) > 0) continue; // 🦇 已經有更強嘅 buff：唔好蓋過
            K.buffEnemy(f, { time: d.rallyTime ?? 6, speed: d.rallySpeed ?? 1.3, hearts: 0, color: 0xffd740 });
            const h = hOf(f);
            K.floatText(W(f.g.position.x, f.g.position.y + h + 0.9, f.g.position.z), [{ text: '🚩 RALLY!', color: '#ffd740' }], 0.6, 1.1);
            n++;
          }
          K.floatText(W(e.g.position.x, hOf(e) + 1.2, e.g.position.z), [{ text: '📯 CHAAARGE!', color: '#ffd740' }], 0.9, 1.4);
          if (n) told('toldLeader', '🚩 The Zombie Leader blew his war horn! Zombies in the gold circle are FASTER for a bit. Poof the Leader first!');
        }
        if (e.t >= 1.3) {
          u.rally = 0;
          e.state = 'walk';
          e.t = 0;
          e.rallyT = rand(7, 9);
          e.cd = Math.max(e.cd, 0.4);
        }
        return;
      }
      if (e.state === 'walk') {
        e.rallyT -= dt;
        if (e.rallyT <= 0 && o.dist < 20) {
          e.state = 'rally';
          e.t = 0;
          e.blown = false;
          K.play('hornBlow');
          return;
        }
      }
      K.baseUpdate(e, dt, time, o);
    },
    remove(e) { mine.delete(e); },
  };

  // ================= 🧛 Draculo =================
  const draculo = {
    radius: 0.6,
    reach: 2.0,
    build: ({ seed }) => {
      const m = buildDraculo({ seed });
      const parts = m.userData.parts;
      m.userData.parts = () => (m.userData.hidden ? [] : parts()); // 變咗霧：打唔中
      return m;
    },
    init(e) {
      mine.add(e);
      e.mistT = rand(2.5, 4);
    },
    onHit(e) {
      if (e.state === 'mist') return false;
      return undefined;
    },
    update(e, dt, time, { dx, dz, dist, face, move }) {
      const g = e.g;
      const u = e.model.userData;
      const pp = P();
      const nx = dist > 0.01 ? dx / dist : 0;
      const nz = dist > 0.01 ? dz / dist : 0;
      e.dir.set(nx, 0, nz);
      const SW = 2.7; // 披風掃幾遠
      const HALF = 0.95; // 扇形一半角度
      switch (e.state) {
        case 'walk': {
          e.mistT -= dt;
          face(dx, dz, 8);
          if (dist > e.reach * 0.85) move(nx, nz, e.speed);
          u.animate(time, dist > e.reach * 0.85 ? 1 : 0.2, 0);
          if (dist < e.reach && e.cd <= 0) {
            e.state = 'windup';
            e.t = 0;
            return;
          }
          if (e.mistT <= 0 && dist > 4.5) { // 💨 變蝙蝠霧
            e.state = 'mist';
            e.t = 0;
            K.play('mistPoof');
            const p0 = W(g.position.x, 1.4, g.position.z);
            K.sparkle(p0, 0x4a148c, 18, 3, 0.8, 0.9);
            K.sparkle(p0, 0xff1744, 8, 2.5, 0.6, 0.4);
            e.model.visible = false;
            u.hidden = true;
            if (e.bar) e.bar.g.visible = false;
            // 喺你前面（左或者右少少）3 米出返嚟 → 你望到個紅色記號
            const f = new THREE.Vector3();
            K.camera.getWorldDirection(f);
            f.y = 0;
            if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
            f.normalize();
            const a = (Math.random() < 0.5 ? 1 : -1) * rand(0.45, 0.95);
            const fx = f.x * Math.cos(a) - f.z * Math.sin(a);
            const fz = f.x * Math.sin(a) + f.z * Math.cos(a);
            e.mistFrom = { x: g.position.x, z: g.position.z };
            e.mistTo = clampLocal(pp.x + fx * 2.2, pp.z + fz * 2.2, 1.5); // 2.2 米：喺披風範圍（SW）入面
            e.mark ||= addMesh(makeMark());
            e.mark.position.set(e.mistTo.x, 0.07, e.mistTo.z);
            e.mark.visible = true;
            told('toldDraculo', '🧛 Draculo turned into bat mist! Look for the RED MARK — he pops out there and swipes his cape!');
          }
          return;
        }
        case 'mist': { // 霧飛過去 + 紅色記號閃
          const k = Math.min(1, e.t / 0.65);
          const mx = THREE.MathUtils.lerp(e.mistFrom.x, e.mistTo.x, k);
          const mz = THREE.MathUtils.lerp(e.mistFrom.z, e.mistTo.z, k);
          if (Math.random() < dt * 40) K.sparkle(W(mx + rand(-0.4, 0.4), 1.2 + rand(-0.4, 0.6), mz + rand(-0.4, 0.4)), Math.random() < 0.3 ? 0xff1744 : 0x4a148c, 1, 0.8, 0.5, 0.6);
          g.position.x = mx;
          g.position.z = mz;
          const mk = e.mark;
          mk.rotation.y += dt * 4;
          mk.userData.fill.material.opacity = 0.2 + k * 0.4 + Math.sin(e.t * 28) * 0.08;
          mk.userData.col.material.opacity = 0.3 + k * 0.5;
          mk.userData.col.scale.y = 0.5 + k * 2.5;
          if (k >= 1) {
            g.position.set(e.mistTo.x, 0, e.mistTo.z);
            e.model.visible = true;
            u.hidden = false;
            if (e.bar) e.bar.g.visible = true;
            mk.visible = false;
            K.play('mistAppear');
            K.sparkle(W(g.position.x, 1.3, g.position.z), 0x7b1fa2, 22, 3.5, 0.7, 0.9);
            g.rotation.y = Math.atan2(-(pp.x - g.position.x), -(pp.z - g.position.z));
            e.state = 'windup';
            e.t = 0;
            e.mistT = rand(4.5, 6.5);
          }
          return;
        }
        case 'windup': { // 舉起披風 + 地上紅色扇形（掃嘅範圍）
          face(dx, dz, 6);
          const wind = 0.6;
          u.animate(time, 0, Math.min(0.6, (e.t / wind) * 0.6));
          if (!e.fan) {
            e.fan = new THREE.Mesh(new THREE.CircleGeometry(SW, 24, PI / 2 - HALF, HALF * 2), K.ADDM(0xff1744, 0));
            e.fan.rotation.x = -PI / 2;
            e.fan.position.y = 0.07;
            g.add(e.fan);
          }
          e.fan.visible = true;
          e.fan.material.opacity = 0.12 + (e.t / wind) * 0.35 + Math.sin(e.t * 30) * 0.05;
          if (e.t >= wind) {
            e.state = 'swipe';
            e.t = 0;
            K.play('capeSwish');
            const f = fwdOf(g);
            const ddx = pp.x - g.position.x;
            const ddz = pp.z - g.position.z;
            const dd = Math.hypot(ddx, ddz);
            const inFan = dd < 0.8 || (ddx * f.x + ddz * f.z) / Math.max(0.01, dd) > Math.cos(HALF);
            if (dd < SW && inFan && pp.feet < 2.2) {
              if (K.hitPlayer('Draculo swiped you with his cape', { x: (ddx / Math.max(0.1, dd)) * 7, y: 4, z: (ddz / Math.max(0.1, dd)) * 7 })) {
                const heal = e.maxHp * (stat('draculo').heal ?? 0.12);
                e.hp = Math.min(e.maxHp, e.hp + heal);
                K.floatText(W(g.position.x, hOf(e) + 1, g.position.z), [{ text: `🧛 +${Math.round(heal)} HEAL`, color: '#ff5252' }], 0.75, 1.2);
                K.sparkle(W(g.position.x, 1.5, g.position.z), 0xff4081, 12, 2, 0.8, 0.5);
                told('toldDraculoHeal', '🧛 Draculo HEALS when he hits you! Stay out of the red fan.');
              }
            }
          }
          return;
        }
        case 'swipe': {
          u.animate(time, 0, 0.6 + Math.min(1, e.t / 0.25) * 0.4);
          if (e.fan) e.fan.material.opacity = Math.max(0, 0.5 - e.t * 2);
          if (e.t >= 0.25) {
            if (e.fan) e.fan.visible = false;
            e.state = 'recover';
            e.t = 0;
          }
          return;
        }
        case 'recover': {
          u.animate(time, 0, Math.max(0, 1 - e.t * 2));
          if (e.t > 0.6) {
            e.state = 'walk';
            e.t = 0;
            e.cd = 1.4 / Math.sqrt(K.speedMul(R.floor));
          }
          return;
        }
        default:
          e.state = 'walk';
      }
    },
    remove(e) {
      mine.delete(e);
      e.mark = dropMesh(e.mark);
      if (e.fan) {
        e.fan.geometry.dispose();
        e.fan.material.dispose();
        e.fan = null;
      }
    },
  };
  // 🧛 出現位：紅圈 + 交叉 + 一條紅光柱
  function makeMark() {
    const g = groundCircle(1.0, 0xd50000);
    for (const r of [PI / 4, -PI / 4]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.16), K.ADDM(0xff5252, 0.9));
      bar.rotation.set(-PI / 2, 0, r);
      bar.position.y = 0.02;
      g.add(bar);
    }
    const col = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xff1744, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    col.scale.set(1.4, 1, 1);
    col.center.set(0.5, 0);
    g.add(col);
    g.userData.col = col;
    return g;
  }

  // ================= 🎈 Zombie Balloon =================
  const balloon = {
    flying: true,
    radius: 0.7,
    reach: 1.5,
    build: ({ seed }) => buildBalloon({ seed }),
    init(e) {
      mine.add(e);
      e.cd = rand(1.5, 2.5);
      e.offA = Math.random() * PI * 2;
    },
    onHit(e, dmg, info) {
      const u = e.model.userData;
      if (u.landed || e.falling) return undefined;
      // 打中上面啲氣球 = 爆一個
      if (info?.point && info.point.y > e.g.position.y + u.balloonY) {
        const b = u.pop(u.balloons.findIndex((x) => !x.popped));
        if (b) {
          K.play('balloonPop');
          K.sparkle(info.point, b.color, 14, 4, 0.5, 0.5);
          K.floatText(V(info.point.x, info.point.y + 0.6, info.point.z), [{ text: `POP! 🎈 ${u.left} left`, color: '#ffffff' }], 0.6, 0.9);
          told('toldBalloonPop', '🎈 POP! Pop all 4 balloons and the Zombie Balloon falls down!');
        }
      }
      return undefined;
    },
    update(e, dt, time, o) {
      const g = e.g;
      const u = e.model.userData;
      const d = stat('balloon');
      const pp = P();
      if (u.landed && !e.falling) { // 跌咗落地：暈一陣，之後慢慢行
        if (e.state === 'dizzy') {
          u.animate(time, 0, 0);
          if (Math.random() < dt * 6) K.sparkle(W(g.position.x + rand(-0.4, 0.4), hOf(e) + 0.2, g.position.z + rand(-0.4, 0.4)), 0xffeb3b, 1, 0.6, 0.6, 0.4);
          if (e.t > 1.4) {
            e.state = 'walk';
            e.t = 0;
          }
          return;
        }
        K.baseUpdate(e, dt, time, o);
        return;
      }
      e.lastY = g.position.y;
      // 剩低嘅氣球越少飛得越低
      const alt = 2.4 + u.left * 0.8; // 4 個 = 5.6 米
      if (!e.falling && (u.left === 0 || e.hp < e.maxHp * (d.popAt ?? 0.4))) { // 全部爆晒 → 跌落嚟
        e.falling = true;
        e.state = 'fall';
        e.t = 0;
        e.vy = 1.5;
        for (let i = 0; i < u.balloons.length; i++) {
          const b = u.pop(i);
          if (b) K.sparkle(W(g.position.x, g.position.y + 4, g.position.z), b.color, 8, 3, 0.5, 0.5);
        }
        u.land();
        e.landedVisual = true;
        K.play('balloonPop');
        K.play('balloonFall');
        if (e.drop) e.drop = dropMesh(e.drop);
        told('toldBalloonFall', '🎈 The Zombie Balloon fell down! Now it just walks slowly.');
      }
      if (e.state === 'fall') {
        e.vy -= 18 * dt;
        g.position.y = Math.max(0, g.position.y + e.vy * dt);
        g.rotation.z = Math.sin(e.t * 14) * 0.15;
        u.animate(time, 1, 0);
        if (g.position.y <= 0) {
          g.rotation.z = 0;
          g.position.y = 0;
          e.falling = false;
          e.state = 'dizzy';
          e.t = 0;
          e.speed *= 0.6;
          e.cd = 1.5;
          K.play('leapLand');
          K.addShake(0.25);
          K.sparkle(W(g.position.x, 0.3, g.position.z), 0xb0bec5, 16, 4, 0.5, 0.7);
          K.floatText(W(g.position.x, hOf(e) + 0.8, g.position.z), [{ text: '💫 BONK!', color: '#ffeb3b' }], 0.7, 1);
        }
        return;
      }
      // 飄去你頭頂附近（側少少）
      if (e.state === 'walk' || e.state === 'rise') e.state = 'walk';
      e.offA += dt * 0.4;
      const tx = pp.x + Math.cos(e.offA) * 1.4;
      const tz = pp.z + Math.sin(e.offA) * 1.4;
      const vx = tx - g.position.x;
      const vz = tz - g.position.z;
      const vd = Math.hypot(vx, vz);
      if (vd > 0.2) o.move(vx / vd, vz / vd, Math.min(e.speed, vd * 1.5));
      g.position.y += (alt + Math.sin(time * 1.3 + e.offA) * 0.25 - g.position.y) * Math.min(1, dt * 1.5);
      o.face(o.dx, o.dz, 1.5);
      if (e.state === 'walk') {
        u.animate(time, 0.5, 0);
        if (e.cd <= 0 && o.dist < 3.5 && g.position.y > 2) {
          e.state = 'drop';
          e.t = 0;
          // 炸彈會落喺你同佢中間（紅圈）
          const ddx = pp.x - g.position.x;
          const ddz = pp.z - g.position.z;
          const dd = Math.hypot(ddx, ddz);
          const lead = Math.min(1.6, dd);
          const at = clampLocal(g.position.x + (dd > 0.01 ? (ddx / dd) * lead : 0), g.position.z + (dd > 0.01 ? (ddz / dd) * lead : 0), 1);
          e.dropTo = at;
        }
      } else if (e.state === 'drop') { // 打開袋 → 跌炸彈
        u.animate(time, 0.3, Math.min(1, e.t / 0.5));
        if (e.t >= 0.5) {
          const bomb = projectileModel('pumpkin', 0xff6d00);
          bomb.scale.setScalar(1.6);
          lob({ model: bomb, from: V(g.position.x, g.position.y + 0.6, g.position.z), to: V(e.dropTo.x, 0.25, e.dropTo.z), dur: 1.35, fall: true, radius: 2.4, msg: 'BOOM! A balloon bomb got you', owner: e });
          K.play('bombThrow');
          K.play('bombFuse');
          told('toldBalloon', '🎈 A Zombie Balloon is dropping pumpkin bombs! Get out of the red circle — and shoot its BALLOONS!');
          e.state = 'walk';
          e.t = 0;
          e.cd = rand(2.6, 3.4) / Math.sqrt(K.speedMul(R.floor));
        }
      }
    },
    remove(e) { mine.delete(e); },
  };

  // ================= 💥 Zombie Cannon =================
  const cannon = {
    radius: 1.1,
    reach: 0,
    build: ({ seed }) => buildCannon({ seed }),
    init(e) {
      mine.add(e);
      e.cd = rand(2, 3);
    },
    update(e, dt, time, { dx, dz, dist }) {
      const g = e.g;
      const u = e.model.userData;
      const d = stat('cannon');
      const pp = P();
      const f = fwdOf(g);
      const blast = d.blast ?? 3.6;
      switch (e.state) {
        case 'walk': {
          const off = turnTo(g, dx, dz, 0.9, dt); // 轉身慢（off = 仲差幾多度先對正你）
          // 企遠遠：太近就退後，太遠就推近（跟住車頭方向）
          const want = dist > 18 ? 1 : dist < 11 ? -0.7 : 0;
          if (want) {
            const ox = g.position.x;
            const oz = g.position.z;
            g.position.x += f.x * want * e.speed * dt;
            g.position.z += f.z * want * e.speed * dt;
            const c = clampLocal(g.position.x, g.position.z, e.radius + 0.4);
            g.position.x = c.x;
            g.position.z = c.z;
            const moved = Math.hypot(g.position.x - ox, g.position.z - oz) * Math.sign(want);
            u.wheelSpin(moved);
          }
          u.animate(time, Math.abs(want), 0);
          u.barrel.rotation.x += (0.08 - u.barrel.rotation.x) * Math.min(1, dt * 4);
          if (e.cd <= 0 && dist < 26 && dist > 4 && off < 0.5) { // 喺佢背脊／側邊：要轉完身先射得
            e.state = 'aim';
            e.t = 0;
            u.aim = 1;
            K.play('bombFuse');
            e.aimWarn ||= addMesh(groundCircle(blast));
            e.aimLine ||= addMesh(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), K.ADDM(0xff1744, 0)));
            e.aimLine.rotation.x = -PI / 2;
            e.aimWarn.visible = e.aimLine.visible = true;
            told('toldCannon', '💥 Zombie Cannon! Get out of the BIG red circle. It turns slowly — run round its SIDE and get it!');
          }
          return;
        }
        case 'aim': { // 瞄準：炮管升高、紅線 + 大紅圈（頭 1.3 秒跟住你，之後鎖定）
          const AIM = 1.9;
          const locked = e.t > 1.3;
          if (!locked) {
            turnTo(g, dx, dz, 0.7, dt);
            const ff = fwdOf(g);
            const range = clamp(dist, 5, 22);
            const at = clampLocal(g.position.x + ff.x * range, g.position.z + ff.z * range, 1);
            e.aimTo = at;
          }
          const ax = e.aimTo.x - g.position.x;
          const az = e.aimTo.z - g.position.z;
          const range = Math.hypot(ax, az);
          u.barrel.rotation.x += (-(0.25 + range * 0.022) - u.barrel.rotation.x) * Math.min(1, dt * 5); // 炮管舉高
          u.animate(time, 0, 0);
          e.aimWarn.position.set(e.aimTo.x, 0.07, e.aimTo.z);
          e.aimWarn.userData.fill.material.opacity = locked ? 0.3 + Math.sin(e.t * 30) * 0.12 : 0.1 + (e.t / 1.3) * 0.15;
          const len = Math.max(0.5, range - blast);
          e.aimLine.scale.set(0.5, len, 1);
          e.aimLine.position.set(g.position.x + (ax / range) * (len / 2 + 0.6), 0.06, g.position.z + (az / range) * (len / 2 + 0.6));
          e.aimLine.rotation.z = Math.atan2(ax / range, az / range);
          e.aimLine.material.opacity = (locked ? 0.45 : 0.22) + Math.sin(e.t * 20) * 0.05;
          if (e.t >= AIM) { // 💥 開炮！
            u.aim = 0;
            u.recoil(1);
            K.play('cannonFire');
            K.addShake(0.25);
            const mx = g.position.x + f.x * 1.7;
            const mz = g.position.z + f.z * 1.7;
            K.sparkle(W(mx, 0.9, mz), 0xffffff, 14, 2.5, 0.8, 1.1);
            K.sparkle(W(mx, 0.9, mz), 0xff9100, 14, 5, 0.4, 0.7);
            e.aimWarn.visible = e.aimLine.visible = false;
            lob({
              model: buildCannonball(), from: V(mx, 0.9, mz), to: V(e.aimTo.x, 0.4, e.aimTo.z),
              dur: 0.9 + range * 0.035, arc: 3 + range * 0.28, radius: blast, msg: 'KABOOM! A cannonball got you', push: 11, boom: 'cannonBoom', owner: e, big: 1.5,
            });
            e.state = 'recover';
            e.t = 0;
          }
          return;
        }
        case 'recover': {
          u.animate(time, 0, 0);
          if (e.t > 0.9) {
            e.state = 'walk';
            e.t = 0;
            e.cd = (d.reload ?? 5.5) / Math.sqrt(K.speedMul(R.floor));
          }
          return;
        }
        default:
          e.state = 'walk';
      }
    },
    remove(e) {
      mine.delete(e);
      e.aimWarn = dropMesh(e.aimWarn);
      e.aimLine = dropMesh(e.aimLine);
    },
  };

  // 每格：炮彈 + 喺半空俾人打散嘅（保持喺佢個高度）
  function update(dt, time) {
    updateLobs(dt, time);
    updateRings(dt);
    for (const e of mine) {
      if (e.state === 'poof' && e.lastY > 0.3 && !e.model.userData.landed) e.g.position.y = e.lastY + Math.sin(Math.min(1, e.t / 0.28) * PI) * 0.5;
    }
  }
  function clear() {
    for (const s of lobs) removeLob(s);
    lobs.length = 0;
    for (const m of [...ownMeshes]) dropMesh(m);
    mine.clear();
    later.length = 0;
  }

  return { kinds: { bat, leader, draculo, balloon, cannon }, update, clear };
}
