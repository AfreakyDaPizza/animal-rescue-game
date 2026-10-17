// 秘密沙灘（小朋友 Issue #2 最後一樣）：打贏 Mutated Scientist Poacher 之後先開
// 乾淨嘅沙灘同大海、星空、流星；長櫈可以坐低睇流星；遠處有個神秘 Ranger → 秘密結局「THE COLLAB」

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BEACH_LOCAL as BEACH, BENCH_LOCAL as BENCH, STRANGER_LOCAL as STRANGER, BEACH_PORTAL_LOCAL as PORTAL, BEACH_OFFSET as OFF } from './labShape.js';
import { addCollider as addWorldCollider } from './world.js';
// 沙灘用本地座標起，成舊搬去 x + OFF；撞嘢圈要用世界座標
const addCollider = (x, z, r) => addWorldCollider(x + OFF, z, r);
import { makeSign, makeLabel, THEMES } from './signs.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';

const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }));
  return materials.get(key);
};
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);

export const beach = { open: false, gate: null, stranger: null, sky: 0, stars: null };

// 森林樹（松樹或者大圓樹，唔撞得）
function forestTree(root, x, z, s, kind) {
  const trunk = mat(0x5d4037);
  add(root, new THREE.BoxGeometry(0.6 * s, 4 * s, 0.6 * s), trunk, x, 2 * s, z);
  if (kind < 0.5) {
    [[3, 1.4, 3.6], [2.3, 1.2, 4.8], [1.4, 1.1, 5.9]].forEach(([w, h, y], i) => add(root, new THREE.BoxGeometry(w * s, h * s, w * s), mat(i % 2 ? 0x2e7d32 : 0x1b5e20), x, y * s, z).rotation.y = i * 0.4);
  } else {
    add(root, new THREE.BoxGeometry(3.4 * s, 2.4 * s, 3.4 * s), mat(0x388e3c), x, 4.6 * s, z);
    add(root, new THREE.BoxGeometry(2.4 * s, 1.6 * s, 2.4 * s), mat(0x43a047), x + 0.6 * s, 6 * s, z + 0.3 * s);
  }
}
// 巨型高樹（邊界）：好粗好高，樹冠好大
function giantTree(root, x, z, s) {
  add(root, new THREE.BoxGeometry(2.2 * s, 22 * s, 2.2 * s), mat(0x4e342e), x, 11 * s, z);
  for (const [dx, dz] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4]]) add(root, new THREE.BoxGeometry(1.2 * s, 2 * s, 1.2 * s), mat(0x3e2723), x + dx * s, 1 * s, z + dz * s); // 樹根
  add(root, new THREE.BoxGeometry(11 * s, 6 * s, 11 * s), mat(0x1b5e20), x, 23 * s, z);
  add(root, new THREE.BoxGeometry(8 * s, 4 * s, 8 * s), mat(0x2e7d32), x + 1.5 * s, 27.5 * s, z - 1 * s);
  add(root, new THREE.BoxGeometry(5 * s, 3 * s, 5 * s), mat(0x388e3c), x - 1.5 * s, 30 * s, z + 1.2 * s);
}

function palm(root, x, z, s = 1) {
  for (let i = 0; i < 6; i++) add(root, new THREE.BoxGeometry(0.45 * s, 0.75 * s, 0.45 * s), mat(i % 2 ? 0x8d6e63 : 0x795548), x - i * 0.1 * s, (0.375 + i * 0.72) * s, z);
  for (let i = 0; i < 6; i++) {
    const leafGeo = new THREE.BoxGeometry(2.6 * s, 0.1 * s, 0.6 * s).translate(1.3 * s, 0, 0);
    add(root, leafGeo, mat(i % 2 ? 0x43a047 : 0x2e7d32), x - 0.55 * s, 4.5 * s, z).rotation.set(0, (i / 6) * Math.PI * 2, -0.45);
  }
  addCollider(x, z, 0.5);
}

export function buildSecretBeach(scene) {
  const root = new THREE.Group();
  root.position.x = OFF;
  scene.add(root);
  const { minX, maxX, minZ, maxZ } = BEACH;
  const cz = (minZ + maxZ) / 2;

  // 沙灘 + 濕沙
  add(root, new THREE.BoxGeometry(maxX - minX + 6, 0.1, maxZ - minZ + 2), mat(0xf3e0b5), (minX + maxX) / 2 + 3, 0.0, cz, false);
  add(root, new THREE.BoxGeometry(3, 0.11, maxZ - minZ + 2), mat(0xd9c48f), maxX + 1, 0.0, cz, false);
  // 大海（一路去到天邊），有浪
  const seaGeo = new THREE.PlaneGeometry(260, 200, 70, 50);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.92 }));
  sea.position.set(maxX + 2 + 130, 0.05, cz);
  root.add(sea);
  const seaBase = seaGeo.attributes.position.array.slice();
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.4, maxZ - minZ + 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  foam.rotation.x = -Math.PI / 2;
  root.add(foam);

  // 返去公園嘅傳送門（綠色漩渦）
  const portal = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x00e676, emissiveIntensity: 1.6 });
  add(portal, new THREE.TorusGeometry(1.6, 0.18, 10, 40), ringMat, 0, 2, 0, false);
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0xb9f6ca, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  swirl.position.y = 2;
  portal.add(swirl);
  portal.rotation.y = Math.PI / 2;
  portal.position.set(PORTAL.x, 0, PORTAL.z);
  root.add(portal);
  const portalLabel = makeLabel([{ text: '🌀 Back to the Park', color: '#b9f6ca' }], 0.8);
  portalLabel.position.set(PORTAL.x, 4.3, PORTAL.z);
  root.add(portalLabel);

  // 棕櫚樹、石、貝殼、海星（乾淨，冇垃圾！）
  for (const [x, z, s] of [[27, 66, 1], [30, 97, 1.1], [41, 98, 0.9], [36, 65, 0.95], [55, 98.5, 1.05], [46, 64.5, 1]]) palm(root, x, z, s);
  // 森林 + 大大棵超高嘅樹做邊界（小朋友：「make a forest around the outside beach... the border will be big giant tall trees」）
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    // 西、南、北三邊（東邊係海）：森林帶 3–14 米厚
    const side = i % 3;
    const depth = 3 + rnd() * 11;
    const x = side === 0 ? minX - depth : minX - 6 + rnd() * (maxX - minX + 10);
    const z = side === 1 ? minZ - depth : side === 2 ? maxZ + depth : minZ - 4 + rnd() * (maxZ - minZ + 8);
    forestTree(root, x, z, 0.9 + rnd() * 0.7, rnd());
  }
  // 最外面一圈：巨型高樹（西邊一行、南北兩行，一路伸出去海邊）
  for (let z = minZ - 15; z <= maxZ + 15; z += 9) giantTree(root, minX - 19, z, 1 + rnd() * 0.4);
  for (let x = minX - 10; x <= maxX + 12; x += 9) {
    giantTree(root, x, minZ - 16, 1 + rnd() * 0.4);
    giantTree(root, x + 4, maxZ + 16, 1 + rnd() * 0.4);
  }
  for (const [x, z, r] of [[33, 90, 0.8], [44, 87, 0.6], [57, 66, 0.9], [38, 76, 0.5]]) {
    add(root, new THREE.DodecahedronGeometry(r), mat(0x9e9e9e, { flatShading: true }), x, r * 0.5, z);
    addCollider(x, z, r);
  }
  for (let i = 0; i < 26; i++) {
    const x = minX + 3 + ((i * 37) % 36);
    const z = minZ + 2 + ((i * 53) % 34);
    if (i % 2) add(root, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 5), mat(i % 4 === 1 ? 0xff7043 : 0xffab91), x, 0.07, z, false).rotation.y = i;
    else add(root, new THREE.SphereGeometry(0.14, 8, 6), mat(0xfff8e1), x, 0.08, z, false).scale.y = 0.5;
  }
  // 篝火（睇流星好暖）
  const fire = new THREE.Group();
  for (let i = 0; i < 5; i++) add(fire, new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6), mat(0x5d4037), Math.cos(i * 1.26) * 0.3, 0.12, Math.sin(i * 1.26) * 0.3).rotation.set(Math.PI / 2, i * 1.26, 0);
  const flames = [0, 1, 2].map((i) => add(fire, new THREE.ConeGeometry(0.35 - i * 0.08, 0.9 - i * 0.15, 6), new THREE.MeshStandardMaterial({ color: [0xff6d00, 0xffab00, 0xffee58][i], emissive: [0xff6d00, 0xffab00, 0xffee58][i], emissiveIntensity: 2.5 }), 0, 0.5 + i * 0.08, 0, false));
  fire.position.set(BENCH.x - 2.4, 0, BENCH.z + 3);
  root.add(fire);
  addCollider(BENCH.x - 2.4, BENCH.z + 3, 0.7);

  // 長櫈（面向海）
  const wood = mat(0xa1887f);
  const bench = new THREE.Group();
  add(bench, rbox(0.7, 0.12, 2.6), wood, 0, 0.55, 0);
  add(bench, rbox(0.1, 0.6, 2.6), wood, -0.32, 0.9, 0);
  for (const s of [-1, 1]) add(bench, new THREE.BoxGeometry(0.6, 0.55, 0.12), mat(0x5d4037), 0, 0.27, s * 1.1);
  bench.position.set(BENCH.x, 0, BENCH.z);
  root.add(bench);
  const benchLabel = makeLabel([{ text: '🌠 Sit here', color: '#fff59d' }], 0.7);
  benchLabel.position.set(BENCH.x, 1.9, BENCH.z);
  root.add(benchLabel);

  // 神秘人：坐喺石上面望住個海（Ninja 樣，認唔出係邊個）
  add(root, new THREE.DodecahedronGeometry(0.9), mat(0x8d8d8d, { flatShading: true }), STRANGER.x, 0.35, STRANGER.z);
  addCollider(STRANGER.x, STRANGER.z, 1.0);
  const stranger = buildAvatar();
  applyRangerSkin({ avatar: stranger }, RANGER_SKINS.find((s) => s.id === 'ninja'));
  stranger.g.scale.setScalar(1.15);
  root.add(stranger.g);
  const strangerLabel = makeLabel([{ text: '❓ ???', color: '#e1bee7' }], 0.8);
  strangerLabel.position.y = 3.1;
  stranger.g.add(strangerLabel);
  stranger.label = strangerLabel;
  beach.stranger = stranger;
  sitStranger();

  // 星空（喺沙灘先見到，beach.sky 0→1）
  const STAR_N = 500;
  const starPos = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const a = Math.random() * Math.PI - Math.PI / 2; // 向東嘅半邊天
    const h = 0.05 + Math.random() * 0.9;
    const r = 380;
    starPos[i * 3] = Math.cos(a) * Math.cos(h) * r;
    starPos[i * 3 + 1] = Math.sin(h) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(h) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  stars.frustumCulled = false;
  root.add(stars);
  beach.stars = stars;

  // 流星雨（小朋友：要型啲）：好多粒，有發光頭、長長嘅彩色尾、閃粉尾巴；間中有粒大火流星跌落海，水面閃一下
  const COLORS = [0x80d8ff, 0xffe57f, 0xea80fc, 0xb9f6ca, 0xff8a80];
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const TRAIL = 14;
  const meteors = Array.from({ length: 16 }, (_, i) => {
    const big = i < 2; // 兩粒大火流星
    const color = big ? 0xff9100 : COLORS[i % COLORS.length];
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(big ? 1.3 : 0.45, 10, 8), new THREE.MeshBasicMaterial({ color: big ? 0xfff3e0 : 0xffffff, fog: false }));
    g.add(head);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(big ? 9 : 3.5);
    g.add(halo);
    const tailLen = big ? 34 : 20;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, big ? 1.1 : 0.4, tailLen, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    tail.geometry.translate(0, tailLen / 2, 0);
    g.add(tail);
    root.add(g);
    // 閃粉尾巴（跟住流星行過嘅位）
    const tp = new Float32Array(TRAIL * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const trail = new THREE.Points(tg, new THREE.PointsMaterial({ color, size: big ? 1.4 : 0.7, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    trail.frustumCulled = false;
    root.add(trail);
    return { g, halo, tail, trail, tp, tg, big, t: 0, dur: big ? 2.6 : 1.2 + Math.random() * 0.8, wait: Math.random() * 5, from: new THREE.Vector3(), to: new THREE.Vector3(), hist: [] };
  });
  // 大火流星跌落海：水面一圈光
  const splashRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0xffcc80, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  splashRing.rotation.x = -Math.PI / 2;
  root.add(splashRing);
  let splashT = 99;
  const resetMeteor = (m) => {
    const z = cz + (Math.random() - 0.5) * 150;
    if (m.big) {
      m.from.set(maxX + 120 + Math.random() * 60, 95 + Math.random() * 20, z);
      m.to.set(maxX + 40 + Math.random() * 40, 0.2, cz + (Math.random() - 0.5) * 60); // 跌落海
    } else {
      m.from.set(maxX + 50 + Math.random() * 150, 60 + Math.random() * 50, z);
      m.to.copy(m.from).add(new THREE.Vector3(-30 - Math.random() * 30, -40 - Math.random() * 25, (Math.random() - 0.5) * 50));
    }
    const dir = m.from.clone().sub(m.to).normalize();
    m.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // 條尾向返嚟嘅方向
    m.t = 0;
    m.hist.length = 0;
  };
  meteors.forEach(resetMeteor);
  beach.meteorBoost = 1; // 秘密結局時流星雨

  return (dt, time) => {
    swirl.rotation.z = time * 2;
    ringMat.emissiveIntensity = 1.3 + Math.sin(time * 3) * 0.4;
    const pos = seaGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = seaBase[i * 3];
      const z = seaBase[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.25 + time * 1.4) * 0.15 + Math.cos(z * 0.2 + time) * 0.12;
    }
    pos.needsUpdate = true;
    seaGeo.computeVertexNormals();
    const wave = (Math.sin(time * 0.8) + 1) / 2;
    foam.position.set(maxX + 0.8 - wave * 2.2, 0.08, cz);
    foam.material.opacity = 0.3 + (1 - wave) * 0.5;
    flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(time * 9 + i * 2) * 0.25;
      f.rotation.y = time * (i + 1);
    });
    beachSky(dt);
    stars.material.opacity = beach.sky * 0.95;
    for (const m of meteors) {
      if (m.wait > 0) {
        m.wait -= dt * beach.meteorBoost;
        m.g.visible = false;
        m.trail.visible = false;
        continue;
      }
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const show = beach.sky > 0.15;
      m.g.visible = show;
      m.trail.visible = show;
      m.g.position.lerpVectors(m.from, m.to, m.big ? k * k : k);
      const fade = Math.sin(k * Math.PI);
      m.tail.material.opacity = 0.75 * (m.big ? 1 : fade);
      m.halo.material.opacity = m.big ? 1 : fade;
      // 閃粉尾巴：記低之前嘅位，慢慢散開
      m.hist.unshift(m.g.position.clone());
      if (m.hist.length > TRAIL) m.hist.pop();
      m.hist.forEach((p, j) => {
        m.tp[j * 3] = p.x + Math.sin(j * 7 + time * 3) * j * 0.08;
        m.tp[j * 3 + 1] = p.y - j * 0.12;
        m.tp[j * 3 + 2] = p.z + Math.cos(j * 5 + time * 3) * j * 0.08;
      });
      for (let j = m.hist.length; j < TRAIL; j++) m.tp[j * 3 + 1] = -9999;
      m.tg.attributes.position.needsUpdate = true;
      if (k >= 1) {
        if (m.big && show) {
          splashRing.position.set(m.to.x, 0.3, m.to.z);
          splashT = 0;
        }
        resetMeteor(m);
        m.wait = (m.big ? 6 + Math.random() * 6 : 0.5 + Math.random() * 3) / beach.meteorBoost;
      }
    }
    splashT += dt;
    splashRing.material.opacity = Math.max(0, 1 - splashT / 1.5);
    splashRing.scale.setScalar(1 + splashT * 14);
  };
}

// 喺沙灘入面：天慢慢變星空（main.js 設定 beach.inside）
function beachSky(dt) {
  const target = beach.inside ? 1 : 0;
  beach.sky += (target - beach.sky) * Math.min(1, dt * 1.5);
}

// 神秘人坐返喺石上面
export function sitStranger() {
  const s = beach.stranger;
  s.g.position.set(STRANGER.x, 0.25, STRANGER.z);
  s.g.rotation.set(0, -Math.PI / 2, 0); // 面向 +x（海）
  for (const leg of s.legs) leg.rotation.x = Math.PI / 2; // 坐低（隻腳向前）
  for (const arm of s.arms) arm.rotation.x = 0;
  s.label.visible = true;
}

// 將天空、霧、光暗啲（星空）；main.js 喺 updateDayNight 之後叫
const NIGHT_BG = new THREE.Color(0x0b1033);
const NIGHT_TOP = new THREE.Color(0x02030f);
export function applyBeachSky(scene, skyUniforms, hemi, sun) {
  const k = beach.sky;
  if (k <= 0.001) return;
  scene.background.lerp(NIGHT_BG, k);
  scene.fog.color.copy(scene.background);
  skyUniforms.bottom.value.copy(scene.background);
  skyUniforms.top.value.lerp(NIGHT_TOP, k);
  hemi.intensity *= 1 - 0.45 * k;
  sun.intensity *= 1 - 0.6 * k;
}

// ================= 秘密結局「THE COLLAB」 =================
// 你行去神秘人度撳 E：佢企起身，原來係另一個 Ranger → 一齊保護動物 → 坐低一齊睇流星雨 → 黑畫面
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function playCollab({ scene, camera, skinId, playMovie, once, shake, play, onDone }) {
  const root = new THREE.Group();
  root.position.x = OFF; // 同沙灘一樣用本地座標
  scene.add(root);
  const s = beach.stranger;
  const S = V(STRANGER.x, 0, STRANGER.z); // 本地（擺嘢用）
  const SW = V(STRANGER.x + OFF, 0, STRANGER.z); // 世界（鏡頭用）
  // 你（用你而家嘅皮膚）
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === skinId) || RANGER_SKINS[0]);
  me.g.scale.setScalar(1.15);
  me.g.position.set(S.x - 3.2, 0, S.z - 2.2);
  me.g.rotation.y = -2.0; // 面向神秘人
  me.g.visible = false; // 第 3 個鏡頭先出現（唔好擋住頭兩個鏡頭）
  root.add(me.g);
  s.label.visible = false;
  const final = [
    '🤝 SECRET ENDING 🤝',
    '<b class="collab">THE COLLAB</b>',
    'Two rangers. One mission.',
    'Together, the endangered animals will always be safe. 🌠',
  ].map((t, i) => `<span class="line" style="animation-delay:${(i * 1.8).toFixed(1)}s">${t}</span>`).join('');
  beach.meteorBoost = 1;
  playMovie(camera, {
    length: 30,
    skipText: 'Click or press any key to keep playing ▶',
    final: { at: 20, html: final },
    shots: [
      [0, 4, { p: V(SW.x - 7, 2.4, SW.z - 5), l: V(SW.x, 1.6, SW.z) }, { p: V(SW.x - 5.5, 2.2, SW.z - 4), l: V(SW.x, 1.6, SW.z) }], // 神秘人背影
      [4, 9, { p: V(SW.x - 1.6, 2.6, SW.z - 2.6), l: V(SW.x, 2.5, SW.z) }, { p: V(SW.x - 1.2, 2.6, SW.z - 2.0), l: V(SW.x, 2.5, SW.z) }], // 佢轉身
      [9, 14, { p: V(SW.x - 1.4, 2.5, SW.z - 5.6), l: V(SW.x - 1.6, 2.1, SW.z - 1.2) }, { p: V(SW.x - 1.2, 2.5, SW.z - 5.0), l: V(SW.x - 1.6, 2.1, SW.z - 1.2) }], // 兩個人
      [14, 20, { p: V(SW.x - 9, 3, SW.z - 1), l: V(SW.x + 30, 22, SW.z - 4) }, { p: V(SW.x - 10, 2.6, SW.z - 1), l: V(SW.x + 30, 30, SW.z - 4) }], // 一齊坐低睇流星雨
    ],
    captions: [
      [0.3, 'Far away on the secret beach, someone was watching the stars...'],
      [14, 'And from that night on, they protected the animals together.'],
    ],
    lines: [
      [1.8, 4, () => s.head, '...', 'ranger'],
      [5, 8.8, () => s.head, 'So YOU are the ranger who saved all the animals!', 'ranger'],
      [9.2, 11.4, () => me.head, 'Who are you?', 'ranger'],
      [11.6, 14, () => s.head, "I'm a ranger from another game! Let's protect them TOGETHER! 🤝", 'ranger'],
    ],
    update(t, dt) {
      // 神秘人：4 秒企起身轉身
      if (t > 4 && once('standUp')) {
        s.g.position.set(S.x - 0.4, 0, S.z - 0.9);
        s.g.rotation.y = 1.13; // 面向你
        for (const leg of s.legs) leg.rotation.x = 0;
        play('pop');
      }
      if (t > 9) me.g.visible = true;
      if (t > 4 && t < 14) s.arms[1].rotation.x = t > 11.6 ? 1.3 + Math.sin(t * 12) * 0.25 : t < 6 ? 2.6 + Math.sin(t * 10) * 0.3 : 0; // 揮手 → 握手
      if (t > 11.6 && t < 14) me.arms[1].rotation.x = 1.3 - Math.sin(t * 12) * 0.25;
      if (t > 11.6 && once('shake')) play('ding');
      // 14 秒：兩個一齊坐喺石上面睇流星雨
      if (t > 14 && once('sit')) {
        sitStranger();
        s.label.visible = false;
        me.g.position.set(S.x, 0.25, S.z - 1.6);
        me.g.rotation.set(0, -Math.PI / 2, 0);
        for (const leg of me.legs) leg.rotation.x = Math.PI / 2;
        me.arms[1].rotation.x = 0;
        beach.meteorBoost = 6; // 流星雨！
        play('magic');
      }
      if (t > 14) {
        me.arms[0].rotation.z = -0.5; // 搭膊頭
        s.arms[0].rotation.z = 0.5;
        if (Math.random() < dt * 2) shake(0.02);
      }
      return null;
    },
    onDone() {
      scene.remove(root);
      beach.meteorBoost = 1;
      for (const arm of s.arms) arm.rotation.z = 0;
      sitStranger();
      onDone?.();
    },
  });
}

// ================= 打贏 Boss 之後：喺秘密沙灘嘅結局（小朋友：打完 Boss 會見到個沙灘） =================
// 動物喺沙灘度玩 → Owner 行過嚟多謝你、俾 $1000 → 黑畫面大字；之後你就喺沙灘度繼續玩
export function playBeachFinale({ scene, camera, playMovie, once, play, owner, standUp, ranger: skinId, animals, reward, onPaid, onDone }) {
  const root = new THREE.Group();
  root.position.x = OFF;
  scene.add(root);
  const W = (x, y, z) => V(x + OFF, y, z); // 本地 → 世界（鏡頭、Owner 用）
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === skinId) || RANGER_SKINS[0]);
  me.g.scale.setScalar(1.2);
  me.g.position.set(38, 0, 81);
  me.g.rotation.y = -Math.PI / 2; // 面向海
  root.add(me.g);
  const pets = animals.map((model, i) => {
    const g = new THREE.Group();
    g.add(model);
    g.position.set(30 + (i % 3) * 2, 0, 76 + Math.floor(i / 3) * 8);
    root.add(g);
    return { g, model, i, goal: V(40 + (i % 3) * 4, 0, 70 + i * 4) };
  });
  const cash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
  cash.visible = false;
  root.add(cash);
  const finalLines = [
    'You saved the endangered animals!',
    `You got paid $${reward.toLocaleString('en-US')}...`,
    "but something's missing...",
    'the pets wanted you to stay here forever,',
    'so you decided to stay with them forever.',
  ].map((t, i) => `<span class="line" style="animation-delay:${(i * 2.1).toFixed(1)}s">${t}</span>`).join('')
    + '<small class="line" style="animation-delay:11s">🐾 THE END 🐾</small>';
  let paid = false;
  const pay = () => {
    if (!paid) {
      paid = true;
      onPaid?.();
    }
  };
  beach.meteorBoost = 3;
  playMovie(camera, {
    length: 33,
    skipText: 'Click or press any key to keep playing ▶',
    final: { at: 19, html: finalLines },
    shots: [
      [0, 6, { p: W(30, 6, 66), l: W(46, 3, 84) }, { p: W(32, 4, 70), l: W(48, 3, 84) }], // 動物跑上沙灘
      [6, 19, { p: W(33.6, 2.9, 80.6), l: W(38.4, 2.4, 80.1) }, { p: W(34.4, 2.7, 80.3), l: W(38.4, 2.4, 80.1) }], // 側面：Owner 同你面對面
    ],
    captions: [
      [0.3, 'Far away from the lab, the animals found a beautiful secret beach... 🏖️'],
      [6, ''],
    ],
    lines: [
      [7.5, 10.5, () => owner.head, 'You did it, Ranger! You saved them ALL! 🎉', 'owner'],
      [10.8, 14, () => owner.head, `Here is $${reward.toLocaleString('en-US')} for being the BEST ranger! 💰`, 'owner'],
      [14.4, 17, () => me.head, 'Thank you! I love it here! 🐾', 'ranger'],
    ],
    update(t, dt) {
      if (once('start')) {
        standUp(owner, 36 + OFF, 75, 0); // Owner 由北邊行過嚟
        owner.label.visible = false;
      }
      for (const p of pets) {
        const d = p.goal.clone().sub(p.g.position);
        d.y = 0;
        const moving = d.length() > 0.3;
        if (moving) {
          p.g.position.add(d.clampLength(0, dt * 4));
          p.g.rotation.y = Math.atan2(-d.x, -d.z);
        } else p.model.position.y = Math.abs(Math.sin(t * 5 + p.i)) * 0.4; // 開心到跳
        p.model.userData.animate?.(t, moving ? 1 : 0);
      }
      // Owner 行埋嚟你隔籬（世界座標）
      const o = owner.g.position;
      const goal = W(38.5, 0, 79.2);
      const d = goal.clone().sub(o);
      d.y = 0;
      if (t > 5 && d.length() > 0.1) {
        o.add(d.clampLength(0, dt * 2.4));
        owner.g.rotation.y = Math.atan2(-d.x, -d.z);
      } else if (t > 5) owner.g.rotation.y = Math.PI; // 面向你（+z）
      if (t > 7.5) me.g.rotation.y = 0; // 你轉身望住 Owner（-z）
      if (t > 7.5 && t < 10.5) owner.arms[1].rotation.x = 2.6 + Math.sin(t * 10) * 0.3; // 揮手
      if (t > 10.8 && t < 13) owner.arms[1].rotation.x = 1.4; // 遞錢
      if (t > 11.5 && t < 16) {
        cash.visible = true;
        const k = Math.min(1, (t - 11.5) / 1.2);
        cash.position.set(38.5, 2.2 + Math.sin(k * Math.PI) * 0.8 + k * 1.4, 79.6 + k * 1.2);
        if (k >= 1 && once('paid')) {
          pay();
          play('coin');
        }
      }
      if (t > 14 && t < 17.5) me.arms.forEach((arm) => (arm.rotation.x = Math.PI)); // 雙手舉高
      if (t > 19 && once('final')) play('magic');
      return null;
    },
    onDone() {
      pay();
      scene.remove(root);
      beach.meteorBoost = 1;
      onDone?.();
    },
  });
}
