// 砌動物模型用嘅工具（方塊風格）：圓角方塊、轉軸、可愛大眼

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const geometries = new Map();
const materials = new Map();

export const BLACK = 0x1a1a1a;
export const WHITE = 0xf7f7f2;

export function material(color, extra) {
  const key = color + JSON.stringify(extra || {});
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra }));
  return materials.get(key);
}

// 圓角方塊（parent 入面，中心喺 x,y,z）；round = 幾圓（0–0.5）
export function box(parent, w, h, d, color, x = 0, y = 0, z = 0, round = 0.22, extra) {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${round}`;
  if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * round));
  const mesh = new THREE.Mesh(geometries.get(key), material(color, extra));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 轉軸（腳、翼、尾由呢度轉）
export function pivot(parent, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

// 可愛大眼：眼白 + 黑眼珠 + 白色反光點（貼喺 head 前面 z）
export function cuteEyes(head, dx, y, z, size = 0.12, { pupil = BLACK, iris = null, white = 0xffffff } = {}) {
  for (const s of [-1, 1]) {
    const x = s * dx;
    box(head, size * 1.05, size * 1.2, 0.03, white, x, y, z, 0.35);
    if (iris) box(head, size * 0.78, size * 0.9, 0.03, iris, x - s * size * 0.06, y - size * 0.08, z - 0.012, 0.4);
    box(head, size * 0.52, size * 0.65, 0.03, pupil, x - s * size * 0.08, y - size * 0.1, z - 0.02, 0.4);
    box(head, size * 0.22, size * 0.22, 0.02, 0xffffff, x + s * size * 0.12, y + size * 0.2, z - 0.035, 0.4);
  }
}

// 四方尖角（4 邊錐），例如犀牛角、雀冠
export function spike(parent, radius, length, color, x, y, z, rotX = 0, rotZ = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 4), material(color));
  m.position.set(x, y, z);
  m.rotation.set(rotX, Math.PI / 4, rotZ);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// 圓波波（拉扁／拉長嘅球），用嚟砌圓頭、面頰、眼
const ballGeo = new THREE.SphereGeometry(1, 20, 14);
export function ball(parent, sx, sy, sz, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(ballGeo, extra?.isMaterial ? extra : material(color, extra));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// 有形狀嘅厚片（耳仔、鰭、刀）：pts = [[x, y], ...] 外形；smooth = 畫成順滑曲線，否則直線（尖角）
// bend(x, y) 回傳厚度方向嘅位移，可以將塊片屈彎（例如象耳彎彎）
// plane：'front' = 塊片喺 xy；'side' = 塊片直企喺 yz（形狀 x → 向前 -z）；'flat' = 打橫喺 xz（形狀 y → 向前 -z）
// key：同一個 key 共用一份形狀（多隻寵物都唔使重新整）
const slabGeos = new Map();
export function slab(parent, pts, depth, color, { x = 0, y = 0, z = 0, plane = 'front', bevel = 0.03, bend, key, extra, smooth = true } = {}) {
  const k = key ? `${key}|${depth}|${bevel}` : null;
  let geo = k && slabGeos.get(k);
  if (!geo) {
    const v = pts.map(([a, b]) => new THREE.Vector2(a, b));
    const shape = new THREE.Shape();
    shape.moveTo(v[0].x, v[0].y);
    if (smooth) shape.splineThru([...v.slice(1), v[0]]);
    else v.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
    geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 8 });
    geo.translate(0, 0, -depth / 2);
    if (bend) {
      const p = geo.attributes.position;
      const nm = geo.attributes.normal;
      const n = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i);
        const py = p.getY(i);
        const b = bend(px, py);
        const fx = (bend(px + 1e-3, py) - b) / 1e-3;
        const fy = (bend(px, py + 1e-3) - b) / 1e-3;
        p.setZ(i, p.getZ(i) + b);
        n.set(nm.getX(i) - fx * nm.getZ(i), nm.getY(i) - fy * nm.getZ(i), nm.getZ(i)).normalize();
        nm.setXYZ(i, n.x, n.y, n.z);
      }
    }
    geo.computeBoundingSphere();
    if (k) slabGeos.set(k, geo);
  }
  const mesh = new THREE.Mesh(geo, extra?.isMaterial ? extra : material(color, extra));
  if (plane === 'side') mesh.rotation.y = Math.PI / 2;
  else if (plane === 'flat') mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
