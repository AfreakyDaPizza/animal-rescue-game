// 🔥 Fire 變異（小朋友 2026-10-17）：Dragon's Lair 繁殖機出嚟嘅寵物有機會變 Fire
// 身邊一圈火焰 + 火星飄上去；錢 ×4（見 balance.js FIRE_MONEY）
// 用法：addFireAura(model)；main.js 每格畫面叫 animateFireAuras(time)
// 🌑 Eclipse 變異（Eclipse 活動被日蝕激光打中）：addFireAura(model, 'eclipse')：黑紫色火 + 一圈白色日冕光環

import * as THREE from 'three';

const flameMats = [0xff6d00, 0xffab00, 0xffee58].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, transparent: true, opacity: 0.85, depthWrite: false }));
const eclipseMats = [[0x1a0033, 0x4a148c], [0x4a148c, 0xaa00ff], [0x12001f, 0x6a1b9a]].map(([c, e]) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1.2, transparent: true, opacity: 0.9, depthWrite: false }));
// 🎃 Halloween Shard 變異：👻 Spectral = 透明青色鬼火 + 一層閃下閃下嘅鬼影；🟣 Phantom = 深紫色煙團圍住轉
const spectralMats = [0x84ffff, 0xb2ebf2, 0x18ffff].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, transparent: true, opacity: 0.45, depthWrite: false }));
const phantomMats = [[0x1a0026, 0x6200ea], [0x311b92, 0x7c4dff], [0x12001f, 0x4a148c]].map(([c, e]) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 0.9, transparent: true, opacity: 0.7, depthWrite: false }));
const smokeGeo = new THREE.SphereGeometry(0.3, 10, 8);
const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
const flameGeo = new THREE.ConeGeometry(0.22, 0.8, 6);
const auras = new Set();

export function addFireAura(model, kind = 'fire') {
  if (kind && kind.includes('+')) return kind.split('+').forEach((k) => addFireAura(model, k)); // 疊咗幾種變異：每種一圈
  model.userData.fireAuras ??= {};
  if (model.userData.fireAuras[kind]) return;
  if (model.userData.noFireAura || model.userData.inner?.userData.noFireAura) return; // Royal Skywhale：小朋友唔要佢身邊有圈火
  const eclipse = kind === 'eclipse';
  const spectral = kind === 'spectral';
  const phantom = kind === 'phantom';
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
    const f = new THREE.Mesh(phantom ? smokeGeo : flameGeo, (spectral ? spectralMats : phantom ? phantomMats : eclipse ? eclipseMats : flameMats)[i % 3]);
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
  const embers = new THREE.Points(geo, new THREE.PointsMaterial({ color: spectral ? 0xe0ffff : phantom ? 0xb388ff : eclipse ? 0xe1bee7 : 0xffab40, size: 0.14 * s, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  // Eclipse：頭頂一圈白色日冕（好似日蝕個光環）
  let corona = null;
  if (eclipse) {
    corona = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.06 * s, 8, 40), coronaMat);
    corona.position.set(center.x, box.max.y + 0.4 * s, center.z);
    corona.rotation.x = Math.PI / 2;
    g.add(corona);
  }
  // Spectral：成隻寵物包住一層半透明青色鬼影（閃下閃下）
  let shell = null;
  if (spectral) {
    shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x84ffff, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    shell.position.copy(center);
    shell.scale.set(Math.max(0.5, size.x * 0.62), Math.max(0.5, size.y * 0.6), Math.max(0.5, size.z * 0.62));
    shell.castShadow = false;
    g.add(shell);
  }
  embers.frustumCulled = false;
  g.add(embers);
  model.add(g);
  model.userData.fireAura = g;
  model.userData.fireAuras[kind] = g;
  auras.add({ g, flames, pos, geo, r, s, center, minY: box.min.y, height: size.y, corona, shell, shellScale: shell?.scale.clone(), phantom });
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
    if (a.phantom) {
      // 煙團：慢慢圍住轉、一上一落、變大變細
      a.flames.forEach(({ f, a: ang, phase }, i) => {
        const k = ang + time * 0.7;
        f.position.set(a.center.x + Math.cos(k) * a.r, a.minY + a.height * (0.25 + 0.5 * ((Math.sin(time * 0.9 + phase) + 1) / 2)), a.center.z + Math.sin(k) * a.r);
        f.scale.setScalar(a.s * (1.1 + Math.sin(time * 2 + i) * 0.35));
      });
    } else for (const { f, phase } of a.flames) f.scale.set(a.s, a.s * (0.8 + Math.abs(Math.sin(time * 6 + phase)) * 0.7), a.s);
    if (a.shell) {
      a.shell.material.opacity = 0.1 + Math.abs(Math.sin(time * 2.2)) * 0.14;
      a.shell.scale.copy(a.shellScale).multiplyScalar(1 + Math.sin(time * 3) * 0.04);
    }
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
