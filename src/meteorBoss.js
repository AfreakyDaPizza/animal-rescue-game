// ☄️ METEORIC 活動期間：Boss 俾隕石撞過嘅樣（Issue #10）
// 身上有裂痕、發藍光嘅裂縫、肩膊同頭頂生出藍色水晶、身邊有火花；光環同碎片變藍色
// 用法：applyMeteorLook(boss) / removeMeteorLook(boss)；每格 updateMeteorLook(bosses, active, time)
// 全部加喺 boss.rig 上面嘅新嘢（userData.meteorLook），拆走就變返原樣；同商店嘅「Meteoric Boss Skin」無關，互不影響
// 如果 boss.rig 俾其他嘢換咗（例如換皮膚），下一格會自動喺新 rig 上面再加

import * as THREE from 'three';
import { crystalMat, glowTexture, seeded } from './meteorKit.js';

const BLUE = new THREE.Color(0x00b0ff);
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0b0d14 }); // 黑色裂痕
const fissureMat = new THREE.MeshStandardMaterial({ color: 0x80d8ff, emissive: 0x00b0ff, emissiveIntensity: 3, roughness: 0.4 }); // 發光裂縫
const sootMat = new THREE.MeshStandardMaterial({ color: 0x1b1e28, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }); // 燒焦咗嘅黑印
const SPIKE = new THREE.OctahedronGeometry(0.5, 0);
const BAR = new THREE.BoxGeometry(1, 1, 1);
const sparkMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0x80d8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// 一個物件喺 parent 坐標入面嘅大細（包埋入面所有 mesh）
const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _b = new THREE.Box3();
function localBox(obj) {
  obj.updateWorldMatrix(true, true);
  _inv.copy(obj.matrixWorld).invert();
  const box = new THREE.Box3();
  obj.traverse((o) => {
    if (!o.isMesh || o.userData.meteorPart) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _b.copy(o.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, o.matrixWorld));
    box.union(_b);
  });
  return box;
}

function part(parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.userData.meteorPart = true;
  m.castShadow = false;
  parent.add(m);
  return m;
}

// 喺一個面（前面 -z）畫一條之字形嘅裂縫：黑色闊啲喺底，發光嗰條幼啲喺面
function zigzag(parent, box, rand, glowing) {
  const w = box.max.x - box.min.x;
  const h = box.max.y - box.min.y;
  const face = box.min.z - 0.035;
  let x = box.min.x + w * (0.25 + rand() * 0.5);
  let y = box.max.y - h * (0.05 + rand() * 0.15);
  const n = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const nx = THREE.MathUtils.clamp(x + (rand() - 0.5) * w * 0.45, box.min.x + w * 0.08, box.max.x - w * 0.08);
    const ny = y - h * (0.14 + rand() * 0.1);
    const len = Math.hypot(nx - x, ny - y);
    const ang = Math.atan2(ny - y, nx - x);
    const cx = (x + nx) / 2;
    const cy = (y + ny) / 2;
    part(parent, BAR, crackMat, cx, cy, face, len + 0.02, w * 0.07, 0.02, 0, 0, ang);
    if (glowing) part(parent, BAR, fissureMat, cx, cy, face - 0.008, len, w * 0.03, 0.02, 0, 0, ang);
    x = nx;
    y = ny;
  }
}

function build(b) {
  const rig = b.rig;
  const rand = seeded(77 + b.biome * 13);
  const added = []; // { parent, obj }
  const add = (parent, obj) => {
    obj.userData.meteorPart = true;
    parent.add(obj);
    added.push({ parent, obj });
    return obj;
  };
  // 身：前面兩三條裂縫 + 背脊同膊頭生水晶 + 燒焦印
  const torso = rig.torso;
  if (torso) {
    const host = add(torso, new THREE.Group());
    const box = localBox(torso);
    // localBox 係 torso 自己坐標，host 都係 torso 嘅 child，所以直接用
    for (let i = 0; i < 2; i++) zigzag(host, box, rand, true);
    zigzag(host, box, rand, false);
    const w = box.max.x - box.min.x;
    const h = box.max.y - box.min.y;
    part(host, BAR, sootMat, box.min.x + w * (0.2 + rand() * 0.2), box.min.y + h * 0.3, box.min.z - 0.03, w * 0.35, h * 0.3, 0.02);
    // 背脊（+z）一排水晶
    const colors = [0x40c4ff, 0x18ffff, 0x7c4dff];
    for (let i = 0; i < 4; i++) {
      const s = Math.min(w, h) * (0.35 + rand() * 0.3);
      part(host, SPIKE, crystalMat(colors[i % 3], 2.2), box.min.x + w * (0.2 + i * 0.2), box.min.y + h * (0.45 + rand() * 0.45), box.max.z, s * 0.35, s, s * 0.35, -0.9 + rand() * 0.3, 0, (rand() - 0.5) * 0.8);
    }
    // 兩邊膊頭頂
    for (const sx of [-1, 1]) {
      const s = Math.min(w, h) * 0.45;
      part(host, SPIKE, crystalMat(0x40c4ff, 2.4), sx * w * 0.42 + (box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2, s * 0.33, s, s * 0.33, 0, 0, -sx * 0.5);
    }
  }
  // 頭：頭頂兩三條水晶 + 一條發光裂縫
  const head = rig.head;
  if (head) {
    const host = add(head, new THREE.Group());
    const box = localBox(head);
    const w = box.max.x - box.min.x;
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    for (let i = 0; i < 3; i++) {
      const s = w * (0.35 + rand() * 0.25);
      part(host, SPIKE, crystalMat(i === 1 ? 0x7c4dff : 0x40c4ff, 2.4), cx + (i - 1) * w * 0.28, box.max.y + s * 0.25, cz + (rand() - 0.5) * w * 0.3, s * 0.3, s, s * 0.3, (rand() - 0.5) * 0.4, 0, (1 - i) * 0.45);
    }
    zigzag(host, { min: { x: box.min.x + w * 0.5, y: box.min.y, z: box.min.z }, max: { x: box.max.x, y: box.max.y, z: box.max.z } }, rand, true);
  }
  // 手臂：一條發光裂縫
  for (const arm of rig.arms || []) {
    const host = add(arm, new THREE.Group());
    const box = localBox(arm);
    zigzag(host, box, rand, true);
  }
  // 火花：身邊閃下閃下嘅藍色光點
  const sparks = [];
  for (let i = 0; i < 6; i++) {
    const s = add(rig.g, new THREE.Sprite(sparkMat));
    s.scale.setScalar(0.4);
    sparks.push({ s, a: rand() * Math.PI * 2, y: 0.8 + rand() * 2.4, r: 0.6 + rand() * 0.5, ph: rand() * 10 });
  }
  // 光環同碎片變藍（記低原本顏色，拆走時變返）
  const saved = { auraColor: b.auraColor.clone(), shardColors: b.shards.map((sh) => ({ m: sh.material, c: sh.material.color.clone(), e: sh.material.emissive.clone() })) };
  b.auraColor.copy(BLUE);
  const shardMats = new Set(b.shards.map((sh) => sh.material));
  for (const m of shardMats) {
    m.color.set(0x80d8ff);
    m.emissive.set(0x00b0ff);
  }
  return { rig, added, sparks, saved };
}

export function applyMeteorLook(b) {
  if (b.meteorLook) return;
  b.meteorLook = build(b);
}

export function removeMeteorLook(b) {
  const look = b.meteorLook;
  if (!look) return;
  for (const { parent, obj } of look.added) parent.remove(obj); // 幾何同物料係共用嘅，唔使 dispose
  b.auraColor.copy(look.saved.auraColor);
  for (const s of look.saved.shardColors) {
    s.m.color.copy(s.c);
    s.m.emissive.copy(s.e);
  }
  b.meteorLook = null;
}

// 每格叫：active = METEORIC 活動進行緊
export function updateMeteorLook(bosses, active, time) {
  for (const b of bosses) {
    if (!active) {
      if (b.meteorLook) removeMeteorLook(b);
      continue;
    }
    if (b.meteorLook && b.meteorLook.rig !== b.rig) removeMeteorLook(b); // rig 換咗：喺新嗰個再加
    if (!b.meteorLook) applyMeteorLook(b);
    for (const sp of b.meteorLook.sparks) {
      const t = time * 1.7 + sp.ph;
      const flick = Math.max(0, Math.sin(t * 5.3) * Math.sin(t * 2.1 + 1));
      sp.s.position.set(Math.cos(sp.a + t * 0.6) * sp.r, sp.y + Math.sin(t) * 0.2, Math.sin(sp.a + t * 0.6) * sp.r);
      sp.s.scale.setScalar(0.15 + flick * 0.55);
    }
    fissureMat.emissiveIntensity = 2.2 + Math.sin(time * 3) * 0.9; // 裂縫一閃一閃
  }
}
