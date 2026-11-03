// ⏳ Time Shard 由天跌落嚟（小朋友 2026-11-03：「each 1-10 minutes drops a time shard」）
// - 玩緊（唔係暫停、唔係播片、唔係 Boss Arena／塔／Reaper 大廳）每隔隨機 TIME_SHARD_MIN–TIME_SHARD_MAX 分鐘
//   一粒發光 Time Shard 由天跌落你身邊（有光尾、落地有衝擊波）
// - 行過去執：入背包做 Gear（shard_time，data/gears.js 自動整）→ 用落寵物 = ⏳ TIME 變異（可愛搖搖眼 + 時鐘光環）
// - TIME_SHARD_STAY 分鐘冇人執就淡出消失（最後 10 秒閃閃下）；同一時間最多一粒（地上有粒就唔會再計時）
//
// main.js 用法：
//   const timeShard = createTimeShardDrop({ scene, isWalkable, groundAt })
//   timeShard.update(dt, time, { pos: camera.position, feetY: player.feetY, playing })  // playing = 正常玩緊先計時
//   timeShard.force()  // 測試：即刻跌一粒（console：game.timeShard()）

import * as THREE from 'three';
import { save } from './state.js';
import { TIME_SHARD_MIN, TIME_SHARD_MAX, TIME_SHARD_STAY } from './data/balance.js';
import { addGear, mutationShardType } from './data/gears.js';
import { buildShardModel } from './gearArt.js';
import { play } from './sound.js';
import { popup, announce, renderHotbar } from './hud.js';

const FALL_HEIGHT = 45; // 由幾高跌落嚟（米）
const FALL_TIME = 1.7; // 跌幾耐（秒）
const PICK_RANGE = 1.7; // 行到幾近執到
const HOVER = 1.0; // 落地之後浮喺地面幾高

const rollWait = () => (TIME_SHARD_MIN + Math.random() * Math.max(0, TIME_SHARD_MAX - TIME_SHARD_MIN)) * 60;

export function createTimeShardDrop({ scene, isWalkable, groundAt }) {
  const type = mutationShardType('time'); // 'shard_time'
  let wait = rollWait(); // 仲有幾多秒（玩緊先減）
  let drop = null; // 地上（或者跌緊）嗰粒

  const gold = new THREE.Color('#ffd54f');
  const beamMat = new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ringMat = new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const beamGeo = new THREE.CylinderGeometry(0.35, 0.6, 30, 20, 1, true).translate(0, 15, 0);
  const trailGeo = new THREE.CylinderGeometry(0.05, 0.45, 9, 12, 1, true).translate(0, 4.5, 0);
  const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);

  // 揀一個你身邊行得到嘅位（3–6 米）；搵唔到就跌喺你腳邊
  function spot(pos, feetY) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 3 + Math.random() * 3;
      const x = pos.x + Math.cos(a) * d;
      const z = pos.z + Math.sin(a) * d;
      if (!isWalkable(x, z, 0.5, feetY)) continue;
      const g = groundAt(x, z, feetY + 0.5);
      if (Math.abs(g - feetY) < 1.2) return { x, z, y: g };
    }
    return { x: pos.x, z: pos.z, y: feetY };
  }

  function spawn(pos, feetY) {
    if (drop) return false;
    const at = spot(pos, feetY);
    const g = new THREE.Group();
    g.position.set(at.x, at.y, at.z);
    const shard = buildShardModel(type) || new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial({ color: gold }));
    shard.scale.setScalar(1.3);
    const spin = new THREE.Group();
    spin.add(shard);
    spin.position.y = FALL_HEIGHT;
    const trail = new THREE.Mesh(trailGeo, trailMat);
    spin.add(trail);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.visible = false;
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;
    ring.visible = false;
    g.add(spin, beam, ring); // 唔加燈：加燈會令全部 shader 重新 compile（卡一卡）
    g.traverse((o) => (o.castShadow = o.receiveShadow = false));
    scene.add(g);
    drop = { g, spin, shard, trail, beam, ring, age: 0, landed: false, life: TIME_SHARD_STAY * 60, ground: at.y };
    play('meteorWhoosh');
    popup('⏳ Look up! A TIME SHARD is falling from the sky!');
    return true;
  }

  function remove() {
    drop?.g.removeFromParent();
    drop = null;
    wait = rollWait();
  }

  function pickUp() {
    addGear(type);
    save();
    renderHotbar();
    play('ding');
    setTimeout(() => play('magic'), 180);
    announce('⏳ You got a TIME SHARD!');
    popup('⏳ Open your 🎒 Inventory (press `) and use it on a pet to make it super CUTE!');
    remove();
  }

  return {
    get drop() {
      return drop;
    },
    get wait() {
      return wait;
    },
    // 測試：即刻跌一粒（地上已經有就唔得）
    force(pos, feetY) {
      if (drop) return false;
      return spawn(pos, feetY);
    },
    update(dt, time, { pos, feetY, playing }) {
      if (!drop) {
        if (!playing) return;
        wait -= dt;
        if (wait <= 0) spawn(pos, feetY);
        return;
      }
      const d = drop;
      const run = playing ? dt : 0; // 暫停：唔跌、唔倒數
      d.age += run;
      d.shard.userData.animate?.(time);
      if (!d.landed) {
        const k = Math.min(1, d.age / FALL_TIME);
        d.spin.position.y = HOVER + (FALL_HEIGHT - HOVER) * (1 - k * k); // 越跌越快
        d.spin.rotation.y = time * 6;
        d.trail.scale.y = 0.4 + (1 - k) * 0.8;
        if (k >= 1) {
          d.landed = true;
          d.landedAt = d.age;
          d.trail.visible = false;
          d.beam.visible = d.ring.visible = true;
          play('superLand');
          play('crystal');
        }
        return;
      }
      // 落咗地：浮下浮下、轉、光柱一閃一閃
      const since = d.age - d.landedAt;
      d.spin.position.y = HOVER + Math.sin(time * 2.2) * 0.18;
      d.spin.rotation.y = time * 1.6;
      // 衝擊波圈：落地嗰下擴散，之後細細個圈喺地上
      const wave = Math.min(1, since / 0.6);
      d.ring.scale.setScalar(wave < 1 ? 0.5 + wave * 5 : 1.1 + Math.sin(time * 3) * 0.1);
      ringMat.opacity = wave < 1 ? 1 - wave * 0.6 : 0.5;
      beamMat.opacity = 0.22 + Math.sin(time * 3) * 0.08;
      // 最後 10 秒：閃閃下，最後 1.5 秒淡出
      const left = d.life - since;
      d.g.visible = left > 10 || Math.sin(time * (left > 4 ? 10 : 22)) > -0.3;
      if (left < 1.5) d.g.scale.setScalar(Math.max(0.01, left / 1.5));
      if (left <= 0) {
        popup('⏳ The Time Shard faded away... another one will fall later!');
        remove();
        return;
      }
      // 行過去執
      if (playing && Math.hypot(pos.x - d.g.position.x, pos.z - d.g.position.z) < PICK_RANGE && Math.abs(feetY - d.ground) < 2.5) pickUp();
    },
  };
}
