// 🐎 馬鞍（小朋友 Issue #16：Ridable Shard 用咗嘅寵物有馬鞍，可以騎）
// buildSaddle()：一個 1 米闊嘅馬鞍（鞍墊、鞍座、鞍頭、鞍尾、腳踏、金釘），原點喺鞍底中間，面向 -z
// addSaddle(model)：搵隻寵物背脊最高嗰點（由上面射條線落去），將馬鞍貼喺度（跟住寵物縮放）
//   回傳 { saddle, seatY }：seatY = 馬鞍面喺 model 自己座標嘅高度（riding.js 用嚟擺人坐喺上面）
// 地塊（hub.js）、手上（animals.js）、騎緊（riding.js）、動畫（mutateFx.js）全部用呢個

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const M = {
  pad: new THREE.MeshStandardMaterial({ color: 0x1e5aa8, roughness: 0.85 }),
  padStripe: new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.85 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x8d4a1f, roughness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x4e2a12, roughness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.8, roughness: 0.3, emissive: 0x3a2800, emissiveIntensity: 0.4 }),
};
const G = {
  pad: new RoundedBoxGeometry(1, 0.08, 1.2, 2, 0.03),
  stripe: new RoundedBoxGeometry(1.02, 0.03, 0.12, 1, 0.01),
  seat: new RoundedBoxGeometry(0.62, 0.12, 0.85, 2, 0.05),
  pommel: new RoundedBoxGeometry(0.5, 0.22, 0.14, 2, 0.05),
  horn: new THREE.CylinderGeometry(0.05, 0.06, 0.16, 8),
  hornCap: new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10),
  cantle: new RoundedBoxGeometry(0.62, 0.3, 0.14, 2, 0.06),
  strap: new THREE.BoxGeometry(0.06, 0.5, 0.05),
  stirrup: new THREE.TorusGeometry(0.09, 0.025, 6, 14),
  stud: new THREE.SphereGeometry(0.03, 8, 6),
};

export function buildSaddle() {
  const g = new THREE.Group();
  g.name = 'saddle';
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(G.pad, M.pad, 0, 0.04, 0);
  for (const z of [-0.5, 0.5]) add(G.stripe, M.padStripe, 0, 0.07, z);
  add(G.seat, M.leather, 0, 0.14, 0.02);
  add(G.pommel, M.leather, 0, 0.24, -0.38, -0.25);
  add(G.horn, M.dark, 0, 0.4, -0.44);
  add(G.hornCap, M.gold, 0, 0.49, -0.45);
  add(G.cantle, M.leather, 0, 0.3, 0.4, 0.3);
  // 兩邊：皮帶 + 腳踏 + 金釘
  const sides = [];
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    side.position.set(s * 0.5, 0.06, 0);
    g.add(side);
    const strap = new THREE.Mesh(G.strap, M.dark);
    strap.position.set(s * 0.03, -0.24, 0);
    side.add(strap);
    const st = new THREE.Mesh(G.stirrup, M.gold);
    st.position.set(s * 0.03, -0.55, 0);
    st.rotation.y = Math.PI / 2;
    side.add(st);
    for (const z of [-0.3, 0, 0.3]) add(G.stud, M.gold, s * 0.31, 0.15, z);
    sides.push(side);
  }
  g.userData.sides = sides;
  return g;
}

const _ray = new THREE.Raycaster();
const _box = new THREE.Box3();
const _v = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

// 背脊喺邊（model 自己座標）：喺寵物中間（前後偏後少少）由上面射落去，第一個撞到嘅（唔計變異特效、名牌、馬鞍、半透明光、userData.noSaddle）
// 回傳 { x, y, z, width }（width = 背脊附近有幾闊，用嚟決定馬鞍大細）
export function backSpot(model) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || o.material?.transparent) return; // 半透明嘅光、光環唔計
    for (let p = o; p && p !== model; p = p.parent) if (p.userData.isMutationAura || p.userData.noSaddle || p.name === 'saddle' || p.isSprite) return; // noSaddle：模型自己嘅裝飾（例如 God Dragon 頭頂個月亮）
    meshes.push(o);
  });
  _box.makeEmpty();
  for (const m of meshes) _box.expandByObject(m);
  if (_box.isEmpty()) return null;
  const size = _box.getSize(new THREE.Vector3());
  const c = _box.getCenter(new THREE.Vector3());
  let best = null;
  // 試幾個位（中間、後少少、前少少），揀撞到但又唔係個頭（太高）嗰個
  for (const dz of [0.08, 0, 0.18, -0.1]) {
    _ray.set(_v.set(c.x, _box.max.y + 1, c.z + dz * size.z), DOWN);
    const hit = _ray.intersectObjects(meshes, false)[0];
    if (!hit) continue;
    if (!best || hit.point.y < best.y) best = hit.point.clone(); // 低啲 = 背脊（唔係個頭）
    if (hit.point.y < _box.min.y + size.y * 0.85) break;
  }
  if (!best) best = new THREE.Vector3(c.x, _box.max.y, c.z);
  const local = model.worldToLocal(best.clone());
  const ws = model.getWorldScale(_v).x || 1;
  return { x: local.x, y: local.y, z: local.z, width: Math.max(0.05, Math.min(size.x * 0.6, size.z * 0.42)) / ws, worldY: best.y, worldMinY: _box.min.y };
}

// 將馬鞍貼喺隻寵物背脊（已經有就唔再加）；回傳 { saddle, seatY }
export function addSaddle(model) {
  const old = model.getObjectByName('saddle');
  if (old) return { saddle: old, seatY: old.userData.seatY };
  const spot = backSpot(model);
  if (!spot) return null;
  const saddle = buildSaddle();
  const k = Math.max(0.05, spot.width);
  saddle.scale.setScalar(k);
  saddle.position.set(spot.x, spot.y + 0.02 * k, spot.z);
  saddle.userData.seatY = spot.y + 0.2 * k;
  saddle.userData.isSaddle = true;
  model.add(saddle);
  return { saddle, seatY: saddle.userData.seatY };
}
