// ☄️ 長期嘅「流星雨」樣（Issue #10，小朋友 2026-10-21）：
// 1. Hub 圍牆外面同生態區兩邊山腳：一叢叢發藍光嘅隕石同水晶（唔郁 → 放入 staticRoot，world.js 用 bakeStatic 焊埋）
// 2. 天上間中有一條淡藍色流星劃過（日頭夜晚都有；METEORIC 活動期間密好多）
// 3.（小朋友 2026-10-22「make the whole map more meteoric vibe」）：生態區撞擊坑（發光藍色裂紋）、地面發光裂縫、
//    山上嵌住嘅大隕石地標、飄浮水晶碎、Hub 外面天上一嚿巨型隕石、夜晚北極光 + 多啲流星
// 全部唔撞嘢（行得穿），唔會擋路

import * as THREE from 'three';
import { HUB, HUB_WALL_H } from './hubShape.js';
import { inHalloween } from './halloweenShape.js';
import { seeded, crystalCluster, meteorRock, makeTrail, orientTrail, CRYSTAL_COLORS, GEO, rockMat, rockMat2, veinMat, glowTexture } from './meteorKit.js';

const STEM_X = 21; // 生態區通道一半闊（同 world.js STEM 一樣）
const BIOME_LENGTH = 62;

// ---- 1. 唔郁嘅裝飾（world.js buildWorld 叫，放入 staticRoot；要喺 buildBiomeBorders 之後叫，因為要搵山丘有幾高）----
// Hub 係一個浮喺天上嘅圓形島，圍牆外面冇地 → 水晶放喺圍牆頂（城垛之間）
const WALL_TOP = HUB_WALL_H + 0.28; // 圍牆頂邊石嘅面（world.js WALL_HEIGHT + 頂邊石；牆高咗水晶跟住升）
// opts（world.js 俾）：scene、sky（夜晚有幾黑）、bake（world.js 嘅 bakeStatic）→ 回傳每格畫面要叫嘅 update(dt, time)
export function buildMeteorDecor(root, opts = {}) {
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
  if (!opts.scene) return null;
  return buildMeteorWorld(root, opts, heightAt);
}

// ---- 3. 成個地圖嘅隕石感（小朋友 2026-10-22）----
// 物料：焦黑地面、地面發光裂縫（夜晚光啲）
const scorchMat = new THREE.MeshStandardMaterial({ color: 0x1c2233, roughness: 1, flatShading: true });
const crackMat = new THREE.MeshStandardMaterial({ color: 0x29b6f6, emissive: 0x0091ea, emissiveIntensity: 0.9, roughness: 0.5 });
const poolMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x00b0ff, emissiveIntensity: 0.7, roughness: 0.3, flatShading: true });
const CYL = new THREE.CylinderGeometry(1, 1, 1, 18);

// 而家鏡頭喺邊、畫質幾高（updateShootingStars 每格畫面寫入；唔使改 main.js）
const view = { cam: new THREE.Vector3(0, 2, 14), quality: 3, sky: null };

// 一塊扁扁嘅方塊（裂縫、坑紋）：由 (x1,z1) 去 (x2,z2)
function strip(root, material, x1, z1, x2, z2, y, w, h = 0.03) {
  const m = new THREE.Mesh(GEO.box, material);
  const len = Math.hypot(x2 - x1, z2 - z1);
  m.scale.set(len, h, w);
  m.position.set((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2);
  m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  root.add(m);
  return m;
}

// 地面發光裂縫：一條彎彎曲曲嘅線 + 一兩條分叉
function crack(root, x, z, y, len, rand) {
  let a = rand() * Math.PI * 2;
  const walk = (px, pz, n, w) => {
    for (let k = 0; k < n; k++) {
      a += (rand() - 0.5) * 1.1;
      const l = len / n * (0.7 + rand() * 0.6);
      const nx = px + Math.cos(a) * l;
      const nz = pz + Math.sin(a) * l;
      strip(root, crackMat, px, pz, nx, nz, y + 0.012, w * (1 - k / (n + 1)));
      if (rand() < 0.3 && w > 0.08) {
        const keep = a;
        a += (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.5);
        walk(nx, nz, 2, w * 0.6);
        a = keep;
      }
      px = nx;
      pz = nz;
    }
  };
  walk(x, z, 4 + Math.floor(rand() * 3), 0.12 + rand() * 0.06);
}

// 撞擊坑：焦黑地面 + 中間一窩發光藍水晶液 + 一圈碎石 + 向外爆開嘅發光裂紋 + 半埋喺地嘅隕石
function crater(root, x, z, y, R, rand) {
  const disc = new THREE.Mesh(CYL, scorchMat);
  disc.scale.set(R * 1.1, 0.04, R * 1.1);
  disc.position.set(x, y + 0.02, z);
  root.add(disc);
  const pool = new THREE.Mesh(CYL, poolMat);
  pool.scale.set(R * 0.42, 0.05, R * 0.42);
  pool.position.set(x, y + 0.03, z);
  root.add(pool);
  // 坑邊：一圈扁扁嘅黑石
  const n = 9 + Math.floor(rand() * 4);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand() * 0.3;
    const s = R * (0.28 + rand() * 0.14);
    const r = new THREE.Mesh(GEO.rock, rand() < 0.5 ? rockMat : rockMat2);
    r.scale.set(s * 1.4, s * 0.55, s);
    r.position.set(x + Math.cos(a) * R, y + s * 0.12, z + Math.sin(a) * R);
    r.rotation.set(rand() * 0.4, -a, rand() * 0.4);
    root.add(r);
  }
  // 向外爆開嘅發光裂紋
  const rays = 5 + Math.floor(rand() * 3);
  for (let k = 0; k < rays; k++) {
    let a = (k / rays) * Math.PI * 2 + rand() * 0.5;
    let px = x + Math.cos(a) * R * 0.4;
    let pz = z + Math.sin(a) * R * 0.4;
    for (let j = 0; j < 3; j++) {
      a += (rand() - 0.5) * 0.7;
      const l = R * (0.35 + rand() * 0.3);
      const nx = px + Math.cos(a) * l;
      const nz = pz + Math.sin(a) * l;
      strip(root, crackMat, px, pz, nx, nz, y + 0.04, 0.16 - j * 0.04);
      px = nx;
      pz = nz;
    }
  }
  // 中間半埋嘅隕石 + 坑邊一兩叢細水晶
  meteorRock(root, x + (rand() - 0.5) * R * 0.3, y - R * 0.12, z + (rand() - 0.5) * R * 0.3, R * (0.35 + rand() * 0.15), rand);
  for (let k = 0; k < 2; k++) {
    const a = rand() * Math.PI * 2;
    crystalCluster(root, x + Math.cos(a) * R * 0.85, y, z + Math.sin(a) * R * 0.85, 0.7 + rand() * 0.7, rand, { colors: [0x40c4ff, 0x18ffff, 0x7c4dff], lean: { x: Math.sin(a) * 0.3, z: -Math.cos(a) * 0.3 } });
  }
}

// 搵空位：生態區入面邊度係平地、冇嘢（樹、屋、水、路牌…）
// 平地 = 好大塊、好薄（沙灘、雪地、柏油地都算地面）；其他嘢個盒擋住就唔放
function makeSpotFinder(roots) {
  const ground = [];
  const block = [];
  const box = new THREE.Box3();
  for (const r of roots) {
    r.updateMatrixWorld(true);
    r.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      box.setFromObject(o, false);
      if (box.isEmpty() || box.max.z < -6 * BIOME_LENGTH - 2 || box.min.z > 1 || box.max.x < -STEM_X || box.min.x > STEM_X) return;
      if (box.max.y < 0.02) return; // 地板（頂喺 0）
      const sx = box.max.x - box.min.x;
      const sz = box.max.z - box.min.z;
      const flat = box.max.y - box.min.y < 0.4 && box.max.y < 0.45 && sx * sz > 60 && !o.material.transparent;
      if (sx > 120 || sz > 120) return; // 好大嘅天空、雲層之類
      (flat ? ground : block).push(box.clone());
    });
  }
  // 回傳地面高度（冇位就 null）
  return (x, z, r) => {
    let gy = 0;
    for (const b of ground) if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) gy = Math.max(gy, b.max.y);
    for (const b of block) {
      if (b.max.y < gy + 0.03 || b.min.y > gy + 3) continue;
      if (b.max.x > x - r && b.min.x < x + r && b.max.z > z - r && b.min.z < z + r) return null;
    }
    return gy;
  };
}

function buildMeteorWorld(root, { scene, sky, bake }, heightAt) {
  view.sky = sky;
  const rand = seeded(2210);
  const free = makeSpotFinder([root, scene]);
  const ok = (b, x) => {
    if (b === 1 && x < -3) return false; // Biome 2：左邊係海
    if (b === 5 && Math.abs(x) < 16) return false; // Biome 6：中間係座山
    return true;
  };
  for (let b = 0; b < 6; b++) {
    const maxZ = -b * BIOME_LENGTH;
    const minZ = maxZ - BIOME_LENGTH;
    // 撞擊坑：每區 3 個（路中間 |x| < 7 唔放，Boss 企嗰頭唔放）
    let made = 0;
    for (let tries = 0; tries < 60 && made < 3; tries++) {
      const R = 1.8 + rand() * 1.4;
      const side = (made + b) % 2 ? 1 : -1;
      const x = side * (7 + R + rand() * (STEM_X - 8.5 - 2 * R));
      const z = maxZ - 6 - rand() * (BIOME_LENGTH - 16);
      if (!ok(b, x)) continue;
      const gy = free(x, z, R * 1.3);
      if (gy === null) continue;
      crater(root, x, z, gy, R, rand);
      made++;
    }
    // 地面發光裂縫：每區 6 條
    made = 0;
    for (let tries = 0; tries < 80 && made < 6; tries++) {
      const x = (rand() < 0.5 ? -1 : 1) * (5 + rand() * (STEM_X - 7));
      const z = maxZ - 3 - rand() * (BIOME_LENGTH - 6);
      if (!ok(b, x)) continue;
      const gy = free(x, z, 1.6);
      if (gy === null) continue;
      crack(root, x, z, gy, 2.5 + rand() * 2, rand);
      made++;
    }
    // 入口兩條柱外面：一叢水晶（貼住山邊，唔阻路）
    for (const side of [-1, 1]) crystalCluster(root, side * (STEM_X - 0.3), 0, maxZ - 2.2, 2.2 + rand(), rand, { colors: CRYSTAL_COLORS, lean: { z: side * 0.3 } });
    // 地標：一嚿嵌咗入山嘅大隕石（左右輪流），四周水晶
    const side = b % 2 ? 1 : -1;
    const lz = minZ + 18 + rand() * (BIOME_LENGTH - 36);
    const lx = side * (STEM_X + 4 + rand() * 2.5);
    const ly = heightAt(lx, lz);
    const big = 5.5 + rand() * 2;
    meteorRock(root, lx, ly - big * 0.32, lz, big, rand);
    meteorRock(root, lx + side * big * 0.6, ly - big * 0.4, lz + big * 0.5, big * 0.55, rand);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const r = big * (0.5 + rand() * 0.5);
      const hx = lx + Math.cos(a) * r;
      const hz = lz + Math.sin(a) * r;
      const hy = Math.max(heightAt(hx, hz), ly - 1);
      crystalCluster(root, hx, hy - 0.2, hz, 2.5 + rand() * 3.2, rand, { colors: CRYSTAL_COLORS, glow: 1.2, lean: { x: Math.sin(a) * 0.35, z: -Math.cos(a) * 0.35 - side * 0.2 } });
    }
    // 山上再多幾叢高水晶（向通道斜）
    for (let k = 0; k < 4; k++) {
      const s2 = rand() < 0.5 ? -1 : 1;
      const x = s2 * (STEM_X + 2 + rand() * 9);
      const z = maxZ - 4 - rand() * (BIOME_LENGTH - 8);
      const y = heightAt(x, z);
      if (y > 0.5 && y < 25) crystalCluster(root, x, y - 0.2, z, 3 + rand() * 3, rand, { colors: [0x40c4ff, 0x18ffff, 0x7c4dff], glow: 1.1, lean: { z: s2 * 0.25 } });
    }
  }

  // ---- 會郁嘅嘢 ----
  const live = new THREE.Group();
  scene.add(live);

  // Hub 外面（西邊）天上一嚿巨型隕石：喺 Hub 入面望過圍牆都見到；慢慢轉、上下浮
  const giant = new THREE.Group();
  giant.position.set(-72, 36, -12); // 西北面：喺 Hub 中間望過圍牆（Library 同 Meteoric Shop 上面）見到
  const tmp = new THREE.Group();
  const gr = seeded(77);
  meteorRock(tmp, 0, -5, 0, 20, gr);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + gr();
    meteorRock(tmp, Math.cos(a) * 9, -6 + gr() * 6, Math.sin(a) * 9, 9 + gr() * 4, gr);
  }
  for (let k = 0; k < 9; k++) {
    const a = gr() * Math.PI * 2;
    const r = 3 + gr() * 7;
    crystalCluster(tmp, Math.cos(a) * r, 2 + gr() * 2, Math.sin(a) * r, 5 + gr() * 6, gr, { colors: CRYSTAL_COLORS, glow: 1.2, lean: { x: Math.sin(a) * 0.4, z: -Math.cos(a) * 0.4 } });
  }
  // 底下吊住嘅水晶（倒轉）
  for (let k = 0; k < 6; k++) {
    const a = gr() * Math.PI * 2;
    const c = crystalCluster(tmp, Math.cos(a) * 6 * gr(), -9, Math.sin(a) * 6 * gr(), 4 + gr() * 4, gr, { colors: [0x40c4ff, 0x7c4dff] });
    c.rotation.x = Math.PI;
  }
  if (bake) bake(tmp, giant);
  else giant.add(tmp);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x64b5f6, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.scale.setScalar(70);
  giant.add(halo);
  live.add(giant);

  // 飄浮水晶碎：一個 InstancedMesh（1 個 draw call），Hub 島四周 + 生態區兩邊山上
  const shards = [];
  for (let k = 0; k < 26; k++) { // Hub 島四周（圍牆外面嘅天空）
    const a = (k / 26) * Math.PI * 2 + rand() * 0.2;
    const r = HUB.r + 4 + rand() * 9;
    const z = HUB.cz + Math.sin(a) * r;
    if (z < 2) continue; // 頂嗰邊係生態區入口
    shards.push([HUB.cx + Math.cos(a) * r, 4 + rand() * 10, z]);
  }
  for (let b = 0; b < 6; b++) {
    for (let k = 0; k < 10; k++) {
      const side = k % 2 ? 1 : -1;
      const x = side * (STEM_X + 1 + rand() * 12);
      const z = -b * BIOME_LENGTH - 3 - rand() * (BIOME_LENGTH - 6);
      shards.push([x, Math.max(heightAt(x, z), 0) + 3 + rand() * 7, z]);
    }
  }
  for (let k = 0; k < 14; k++) { // 巨型隕石四周
    const a = (k / 14) * Math.PI * 2;
    const r = 22 + rand() * 10;
    shards.push([giant.position.x + Math.cos(a) * r, giant.position.y - 8 + rand() * 18, giant.position.z + Math.sin(a) * r]);
  }
  const shardMat = new THREE.MeshStandardMaterial({ color: 0x80d8ff, emissive: 0x40c4ff, emissiveIntensity: 1.1, roughness: 0.25, flatShading: true });
  const inst = new THREE.InstancedMesh(GEO.spike, shardMat, shards.length);
  inst.frustumCulled = false;
  const tints = [0x40c4ff, 0x18ffff, 0x7c4dff, 0xea80fc, 0x448aff];
  const info = shards.map(([x, y, z], i) => {
    inst.setColorAt(i, new THREE.Color(tints[i % tints.length]).lerp(new THREE.Color(0xffffff), 0.25));
    const w = 0.3 + rand() * 0.5;
    return { x, y, z, w, h: w * (3 + rand() * 2.5), phase: rand() * 6.3, spin: (rand() - 0.5) * 1.2, tilt: (rand() - 0.5) * 0.6 };
  });
  live.add(inst);

  // 夜晚北極光：三條好大嘅彩帶喺天邊（跟住鏡頭，好似天空咁）
  const aurora = new THREE.Group();
  const auroraUniforms = { time: { value: 0 }, amount: { value: 0 } };
  const auroraMat = new THREE.ShaderMaterial({
    uniforms: auroraUniforms,
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; varying vec2 vUv;
      void main() { vUv = uv; vec3 p = position;
        p.y += sin(uv.x * 9.0 + time * 0.35) * 9.0 + sin(uv.x * 23.0 - time * 0.6) * 3.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float time; uniform float amount; varying vec2 vUv;
      void main() {
        float rays = 0.55 + 0.45 * sin(vUv.x * 140.0 + sin(vUv.x * 13.0 + time * 0.4) * 6.0);
        float fadeY = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        float fadeX = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
        vec3 col = mix(vec3(0.0, 0.85, 1.0), vec3(0.45, 0.3, 1.0), vUv.y);
        gl_FragColor = vec4(col * rays * fadeY * fadeX * amount * 0.55, 1.0);
      }`,
  });
  // 一條彎彎嘅彩帶（圓弧）：center = 方向（弧度），span = 闊幾多，r = 幾遠
  const ribbon = (center, span, r, y, h) => {
    const seg = 64;
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const a = center - span / 2 + span * t;
      const rr = r + Math.sin(t * 7.0) * 18;
      for (const v of [0, 1]) {
        pos.push(Math.cos(a) * rr, y + v * h, Math.sin(a) * rr);
        uv.push(t, v);
      }
      if (i < seg) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, auroraMat);
    m.frustumCulled = false;
    m.renderOrder = -0.5; // 天空之後、其他嘢之前
    aurora.add(m);
  };
  ribbon(-Math.PI / 2, 1.5, 330, 70, 90); // 生態區方向（北）
  ribbon(-Math.PI / 2 - 1.3, 1.0, 360, 85, 70);
  ribbon(-Math.PI / 2 + 1.4, 1.1, 350, 60, 80);
  aurora.visible = false;
  live.add(aurora);

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();
  return (dt, time) => {
    const night = sky ? sky.uniforms.moonAmt.value : 0;
    const away = inHalloween(view.cam.x, view.cam.z); // 🎃 Halloween 世界有自己個天
    const q = view.quality;
    // 夜晚：裂縫、隕石發光強啲
    crackMat.emissiveIntensity = 0.9 + night * 0.9;
    poolMat.emissiveIntensity = 0.7 + night * 0.8;
    veinMat.emissiveIntensity = 1.4 + night * 0.6;
    live.visible = !away;
    if (away) return;
    giant.rotation.y = time * 0.03;
    giant.position.y = 36 + Math.sin(time * 0.3) * 1.2;
    halo.material.opacity = 0.35 + night * 0.2;
    // 水晶碎：最低畫質唔要；低畫質每兩格先郁一次
    inst.visible = q > 0;
    if (inst.visible && (q > 1 || Math.floor(time * 30) % 2 === 0)) {
      info.forEach((s, i) => {
        _p.set(s.x, s.y + Math.sin(time * 0.8 + s.phase) * 0.6, s.z);
        _e.set(s.tilt, time * s.spin + s.phase, s.tilt * 0.5);
        _s.set(s.w, s.h, s.w);
        inst.setMatrixAt(i, _m.compose(_p, _q.setFromEuler(_e), _s));
      });
      inst.instanceMatrix.needsUpdate = true;
    }
    // 北極光：淨係夜晚（同黃昏尾）
    auroraUniforms.amount.value = night;
    auroraUniforms.time.value = time;
    aurora.visible = q > 0 && night > 0.02;
    if (aurora.visible) aurora.position.set(view.cam.x, view.cam.y - 2, view.cam.z); // 好似天空咁跟住鏡頭
  };
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
  view.cam.copy(camPos); // 俾第 3 部分（北極光、水晶碎）用
  view.quality = quality;
  const night = view.sky ? view.sky.uniforms.moonAmt.value : 0;
  rate *= 1 + night * 4; // 夜晚流星密好多（小朋友 2026-10-22）
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
