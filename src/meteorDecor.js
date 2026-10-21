// ☄️ 長期嘅「流星雨」樣（Issue #10，小朋友 2026-10-21）：
// 1. Hub 圍牆外面同生態區兩邊山腳：一叢叢發藍光嘅隕石同水晶（唔郁 → 放入 staticRoot，world.js 用 bakeStatic 焊埋）
// 2. 天上間中有一條淡藍色流星劃過（日頭夜晚都有；METEORIC 活動期間密好多）
// 全部唔撞嘢（行得穿），唔會擋路

import * as THREE from 'three';
import { HUB } from './hubShape.js';
import { seeded, crystalCluster, meteorRock, makeTrail, orientTrail, CRYSTAL_COLORS } from './meteorKit.js';

const STEM_X = 21; // 生態區通道一半闊（同 world.js STEM 一樣）
const BIOME_LENGTH = 62;

// ---- 1. 唔郁嘅裝飾（world.js buildWorld 叫，放入 staticRoot；要喺 buildBiomeBorders 之後叫，因為要搵山丘有幾高）----
// Hub 係一個浮喺天上嘅圓形島，圍牆外面冇地 → 水晶放喺圍牆頂（城垛之間）
const WALL_TOP = 3.78; // 圍牆頂邊石嘅面（world.js WALL_HEIGHT + 頂邊石）
export function buildMeteorDecor(root) {
  const rand = seeded(1010);
  const a0 = Math.asin(-HUB.cz / HUB.r);
  const a1 = Math.PI - a0;
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.3 + rand() * 0.4)) / steps;
    const x = HUB.cx + Math.cos(a) * HUB.r;
    const z = HUB.cz + Math.sin(a) * HUB.r;
    if (z > HUB.cz && Math.abs(x) < 6) continue; // 大門頂唔好放
    const out = { x: Math.cos(a), z: Math.sin(a) }; // 向外
    if (i % 3 === 1) meteorRock(root, x, WALL_TOP - 0.3, z, 0.9 + rand() * 0.4, rand);
    else crystalCluster(root, x, WALL_TOP - 0.1, z, 2 + rand() * 1.5, rand, { colors: i % 4 === 0 ? CRYSTAL_COLORS : [0x40c4ff, 0x448aff], lean: { x: out.z * 0.15, z: -out.x * 0.15 } });
  }
  // 生態區兩邊嘅山丘：搵出每級山有幾高，喺級面放隕石同水晶（斜斜向通道，喺路度望得到）
  const hills = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (Math.abs(p.x) > STEM_X + 0.3 && p.z < 0 && p.z > -6 * BIOME_LENGTH && o.scale.x > 1.5 && o.scale.z > 1.5) hills.push(o); // 淨係山丘嘅大方塊（唔要樹）
  });
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 80);
  const heightAt = (x, z) => {
    ray.ray.origin.set(x, 60, z);
    const hit = ray.intersectObjects(hills, false)[0];
    return hit ? hit.point.y : 0;
  };
  for (let b = 0; b < 6; b++) {
    const maxZ = -b * BIOME_LENGTH;
    for (const side of [-1, 1]) {
      for (let z = maxZ - 3 - rand() * 3; z > maxZ - BIOME_LENGTH + 3; z -= 5 + rand() * 4) {
        // 山腳：細細叢（貼住山邊）
        const x0 = side * (STEM_X - 0.1 + rand() * 0.3); // 山身由牆外 0.4 米開始
        if (rand() < 0.4) meteorRock(root, x0, 0, z, 0.8 + rand() * 0.8, rand);
        else crystalCluster(root, x0, 0, z, 1 + rand() * 1.2, rand, { colors: b === 5 ? CRYSTAL_COLORS : [0x40c4ff, 0x18ffff, 0x448aff], lean: { z: side * 0.35 } });
        // 山上：大啲嘅水晶叢
        if (rand() < 0.55) {
          const x = side * (STEM_X + 1.2 + rand() * 5);
          const y = heightAt(x, z);
          if (y > 0.5 && y < 25) crystalCluster(root, x, y - 0.1, z, 1.8 + rand() * 1.8, rand, { colors: rand() < 0.3 ? CRYSTAL_COLORS : [0x40c4ff, 0x448aff, 0x18ffff], lean: { z: side * 0.2 } });
        }
      }
    }
  }
}

// ---- 2. 天上嘅流星 ----
// 流星喺鏡頭附近嘅天空（60–140 米高）劃過，好遠，唔會遮住玩
export function createShootingStars(scene, max = 6) {
  const list = [];
  for (let i = 0; i < max; i++) {
    const trail = makeTrail(0xb3e5fc, 0.9);
    trail.visible = false;
    scene.add(trail);
    list.push({ trail, t: 0, life: 0, head: new THREE.Vector3(), vel: new THREE.Vector3(), len: 30 });
  }
  return { list, wait: 4 + Math.random() * 8 };
}

const _back = new THREE.Vector3();
// rate：1 = 平時（大約每 10–25 秒一條），活動期間俾大啲（例如 12）；quality 0 = 最低畫質：少啲
export function updateShootingStars(ss, dt, camPos, { rate = 1, quality = 3 } = {}) {
  ss.wait -= dt * rate * (quality === 0 ? 0.5 : 1);
  if (ss.wait <= 0) {
    ss.wait = 10 + Math.random() * 15;
    const s = ss.list.find((x) => x.t >= x.life);
    if (s) {
      // 喺鏡頭四周隨機一個方向嘅天空開始，斜斜向下飛
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 120;
      s.head.set(camPos.x + Math.cos(a) * d, 70 + Math.random() * 70, camPos.z + Math.sin(a) * d);
      const dir = a + Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 90 + Math.random() * 70;
      s.vel.set(Math.cos(dir) * speed, -speed * (0.25 + Math.random() * 0.25), Math.sin(dir) * speed);
      s.t = 0;
      s.life = 0.7 + Math.random() * 0.6;
      s.len = 25 + Math.random() * 30;
      s.trail.visible = true;
    }
  }
  for (const s of ss.list) {
    if (s.t >= s.life) {
      s.trail.visible = false;
      continue;
    }
    s.t += dt;
    s.head.addScaledVector(s.vel, dt);
    const k = s.t / s.life;
    s.trail.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.95; // 慢慢出、慢慢消失
    _back.copy(s.vel).multiplyScalar(-1);
    orientTrail(s.trail, s.head, _back, s.len * Math.min(1, k * 3), 1.6, camPos);
  }
}
