// 🔥 Fire 變異（小朋友 2026-10-17）：Dragon's Lair 繁殖機出嚟嘅寵物有機會變 Fire
// 身邊一圈火焰 + 火星飄上去；錢 ×4（見 balance.js FIRE_MONEY）
// 用法：addFireAura(model)；main.js 每格畫面叫 animateFireAuras(time)
// 🌑 Eclipse 變異（Eclipse 活動被日蝕激光打中）：addFireAura(model, 'eclipse')：黑紫色火 + 一圈白色日冕光環

import * as THREE from 'three';

const flameMats = [0xff6d00, 0xffab00, 0xffee58].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.85, depthWrite: false }));
const eclipseMats = [[0x1a0033, 0x4a148c], [0x4a148c, 0xaa00ff], [0x12001f, 0x6a1b9a]].map(([c, e]) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1.2, transparent: true, opacity: 0.9, depthWrite: false }));
const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
const flameGeo = new THREE.ConeGeometry(0.22, 0.8, 6);
const auras = new Set();

export function addFireAura(model, kind = 'fire') {
  if (kind && kind.includes('+')) return kind.split('+').forEach((k) => addFireAura(model, k)); // 疊咗幾種變異：每種一圈
  model.userData.fireAuras ??= {};
  if (model.userData.fireAuras[kind]) return;
  if (model.userData.noFireAura || model.userData.inner?.userData.noFireAura) return; // Royal Skywhale：小朋友唔要佢身邊有圈火
  const eclipse = kind === 'eclipse';
  model.updateMatrixWorld(true);
  const world = new THREE.Box3().setFromObject(model);
  if (world.isEmpty()) return;
  // 轉做 model 自己嘅座標（之後放大縮細、搬位都跟住）
  const box = new THREE.Box3().setFromPoints([model.worldToLocal(world.min.clone()), model.worldToLocal(world.max.clone())]);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const g = new THREE.Group();
  const r = Math.max(size.x, size.z) * 0.55 + 0.15; // 第二圈變異：個框已經包埋第一圈火，所以自然大啲
  const s = Math.max(0.6, Math.max(size.x, size.y, size.z) / 2);
  const flames = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const f = new THREE.Mesh(flameGeo, (eclipse ? eclipseMats : flameMats)[i % 3]);
    f.position.set(center.x + Math.cos(a) * r, box.min.y + 0.3 * s, center.z + Math.sin(a) * r);
    f.scale.setScalar(s);
    f.castShadow = false;
    g.add(f);
    flames.push({ f, a, phase: Math.random() * 6 });
  }
  const N = 24;
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(geo, new THREE.PointsMaterial({ color: eclipse ? 0xe1bee7 : 0xffab40, size: 0.14 * s, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  // Eclipse：頭頂一圈白色日冕（好似日蝕個光環）
  let corona = null;
  if (eclipse) {
    corona = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.06 * s, 8, 40), coronaMat);
    corona.position.set(center.x, box.max.y + 0.4 * s, center.z);
    corona.rotation.x = Math.PI / 2;
    g.add(corona);
  }
  embers.frustumCulled = false;
  g.add(embers);
  model.add(g);
  model.userData.fireAura = g;
  model.userData.fireAuras[kind] = g;
  auras.add({ g, flames, pos, geo, r, s, center, minY: box.min.y, height: size.y, corona });
}

// 寵物仲喺唔喺場景（拎走咗就唔郁）
const onStage = (o) => {
  while (o.parent) o = o.parent;
  return o.isScene;
};

export function animateFireAuras(time) {
  for (const a of auras) {
    if (!a.g.parent) {
      auras.delete(a);
      continue;
    }
    if (!onStage(a.g)) continue;
    for (const { f, phase } of a.flames) f.scale.set(a.s, a.s * (0.8 + Math.abs(Math.sin(time * 6 + phase)) * 0.7), a.s);
    for (let i = 0; i < a.pos.length / 3; i++) {
      const k = (time * 0.6 + i / 24) % 1;
      const ang = i * 2.4 + time;
      a.pos[i * 3] = a.center.x + Math.cos(ang) * a.r * (1 - k * 0.5);
      a.pos[i * 3 + 1] = a.minY + k * a.height * 1.3;
      a.pos[i * 3 + 2] = a.center.z + Math.sin(ang) * a.r * (1 - k * 0.5);
    }
    a.geo.attributes.position.needsUpdate = true;
    if (a.corona) {
      a.corona.rotation.z = time * 1.5;
      a.corona.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
    }
  }
}
