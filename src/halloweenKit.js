// 🎃 Halloween 模型共用小工具（Boss 同靈魂用）
// 同 modelKit 唔同：發光材質每次新開一個（逐個可以閃），普通材質就共用
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const mats = new Map();
// 普通材質（共用）
export function M(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return mats.get(key);
}
// 發光材質（每次一個新嘅，可以獨立閃）
export const G = (color, k = 1.6, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, ...extra });
// 半透明加亮（火焰、光暈、靈魂）
export const ADD = (color, opacity = 0.7) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
// 半透明（袍、幽靈身體）
export const GHOST = (color, opacity = 0.75, k = 0.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, transparent: true, opacity, depthWrite: false, roughness: 0.5, side: THREE.DoubleSide });

const boxGeos = new Map();
export function bx(parent, w, h, d, mat, x = 0, y = 0, z = 0, round = 0.2) {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${round}`;
  if (!boxGeos.has(key)) boxGeos.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * round));
  const m = new THREE.Mesh(boxGeos.get(key), mat);
  m.position.set(x, y, z);
  m.castShadow = !mat.transparent;
  parent.add(m);
  return m;
}
const sphereGeo = new THREE.SphereGeometry(1, 18, 12);
const lowSphere = new THREE.SphereGeometry(1, 10, 7);
export function sph(parent, sx, sy, sz, mat, x = 0, y = 0, z = 0, low = false) {
  const m = new THREE.Mesh(low ? lowSphere : sphereGeo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = !mat.transparent;
  parent.add(m);
  return m;
}
const coneGeos = new Map();
export function cone(parent, r, h, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 6) {
  const key = `${r},${h},${seg}`;
  if (!coneGeos.has(key)) coneGeos.set(key, new THREE.ConeGeometry(r, h, seg));
  const m = new THREE.Mesh(coneGeos.get(key), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = !mat.transparent;
  parent.add(m);
  return m;
}
const cylGeos = new Map();
export function cyl(parent, r, h, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0, r2 = r) {
  const key = `${r},${r2},${h}`;
  if (!cylGeos.has(key)) cylGeos.set(key, new THREE.CylinderGeometry(r2, r, h, 8));
  const m = new THREE.Mesh(cylGeos.get(key), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = !mat.transparent;
  parent.add(m);
  return m;
}
// 一條由 a 去 b 嘅骨／棍（圓柱）
const UP = new THREE.Vector3(0, 1, 0);
export function between(parent, a, b, r, mat, r2 = r) {
  const m = cyl(parent, r, a.distanceTo(b), mat, 0, 0, 0, 0, 0, r2);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return m;
}
export function piv(parent, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
// 鐵鏈：一串圈圈（由 a 去 b）
const linkGeo = new THREE.TorusGeometry(0.07, 0.022, 5, 10);
export function chain(parent, a, b, n, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const l = new THREE.Mesh(linkGeo, mat);
    l.position.lerpVectors(a, b, t);
    l.position.y -= Math.sin(t * Math.PI) * a.distanceTo(b) * 0.15; // 垂低少少
    l.lookAt(b);
    l.rotation.z = i % 2 ? Math.PI / 2 : 0;
    g.add(l);
  }
  parent.add(g);
  return g;
}
// 一團向上嘅火（3 層加亮錐）：回傳 group，userData.flicker(t) 會閃
export function flame(parent, x, y, z, s = 1, colors = [0xffeb3b, 0xff9100, 0xff3d00]) {
  const f = new THREE.Group();
  const layers = colors.map((c, i) => {
    const m = cone(f, (0.12 + i * 0.07) * s, (0.4 + i * 0.22) * s, ADD(c, 0.75 - i * 0.12), 0, (0.2 + i * 0.11) * s, 0, 0, 0, 7);
    m.castShadow = false;
    return m;
  });
  f.position.set(x, y, z);
  parent.add(f);
  const seed = Math.random() * 10;
  f.userData.flicker = (t) => layers.forEach((m, i) => {
    const k = 1 + Math.sin(t * (11 + i * 3) + seed + i) * 0.15;
    m.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    m.rotation.y = t * (1 + i) + seed;
  });
  return f;
}
