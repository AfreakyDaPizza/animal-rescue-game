// 秘密沙灘（小朋友 Issue #2 最後一樣）：打贏 Mutated Scientist Poacher 之後先開
// 乾淨嘅沙灘同大海、星空、流星；長櫈可以坐低睇流星；遠處有個神秘 Ranger → 秘密結局「THE COLLAB」

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BEACH, BEACH_PASS, BENCH, STRANGER } from './labShape.js';
import { addCollider } from './world.js';
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

  // 入口：棕櫚樹拱門（未開就有道紫色力場）
  for (const z of [BEACH_PASS.minZ + 0.3, BEACH_PASS.maxZ - 0.3]) {
    add(root, rbox(0.8, 4.6, 0.8), mat(0x8d6e63), minX, 2.3, z);
    addCollider(minX, z, 0.6);
  }
  add(root, rbox(1, 0.6, BEACH_PASS.maxZ - BEACH_PASS.minZ), mat(0x6d4c41), minX, 4.7, (BEACH_PASS.minZ + BEACH_PASS.maxZ) / 2);
  const sign = makeSign([{ text: '🌊 SECRET BEACH', size: 0.42 }], 5, 1, THEMES.blue);
  sign.position.set(minX - 0.6, 5.6, (BEACH_PASS.minZ + BEACH_PASS.maxZ) / 2);
  sign.rotation.y = -Math.PI / 2;
  root.add(sign);
  const gate = new THREE.Group();
  const field = new THREE.Mesh(new THREE.PlaneGeometry(BEACH_PASS.maxZ - BEACH_PASS.minZ - 1, 4.2), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  field.rotation.y = Math.PI / 2;
  field.position.set(minX, 2.1, (BEACH_PASS.minZ + BEACH_PASS.maxZ) / 2);
  gate.add(field);
  const lock = makeSign([{ text: '🔒 LOCKED', size: 0.4 }, { text: 'Defeat the Mutated Scientist Poacher!', size: 0.18 }], 4, 1.2, THEMES.purple);
  lock.position.set(minX - 0.3, 2.2, (BEACH_PASS.minZ + BEACH_PASS.maxZ) / 2);
  lock.rotation.y = -Math.PI / 2;
  gate.add(lock);
  root.add(gate);
  beach.gate = gate;

  // 棕櫚樹、石、貝殼、海星（乾淨，冇垃圾！）
  for (const [x, z, s] of [[27, 66, 1], [30, 97, 1.1], [41, 98, 0.9], [36, 65, 0.95], [55, 98.5, 1.05], [46, 64.5, 1]]) palm(root, x, z, s);
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
  scene.add(stars);
  beach.stars = stars;

  // 流星：喺海上面嘅天空劃過（有條尾）
  const meteors = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    g.add(head);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 14, 8, 1, true), new THREE.MeshBasicMaterial({ color: [0x80d8ff, 0xffe57f, 0xea80fc][i % 3], transparent: true, opacity: 0.7, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    tail.geometry.translate(0, 7, 0);
    g.add(tail);
    scene.add(g);
    return { g, t: Math.random() * 6, dur: 1.4 + Math.random(), wait: 1 + Math.random() * 4, from: new THREE.Vector3(), to: new THREE.Vector3() };
  });
  const resetMeteor = (m) => {
    const z = cz + (Math.random() - 0.5) * 140;
    m.from.set(maxX + 60 + Math.random() * 140, 70 + Math.random() * 40, z);
    m.to.copy(m.from).add(new THREE.Vector3(-30 - Math.random() * 30, -45 - Math.random() * 20, (Math.random() - 0.5) * 50));
    const dir = m.from.clone().sub(m.to).normalize();
    m.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // 條尾向返嚟嘅方向
    m.t = 0;
  };
  meteors.forEach(resetMeteor);
  beach.meteorBoost = 1; // 秘密結局時流星雨

  return (dt, time) => {
    beach.gate.visible = !beach.open;
    field.material.opacity = 0.35 + Math.sin(time * 3) * 0.12;
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
        continue;
      }
      m.t += dt;
      const k = m.t / m.dur;
      m.g.visible = beach.sky > 0.15;
      m.g.position.lerpVectors(m.from, m.to, k);
      m.g.children[1].material.opacity = 0.7 * Math.sin(Math.min(1, k) * Math.PI);
      if (k >= 1) {
        resetMeteor(m);
        m.wait = (1 + Math.random() * 4) / beach.meteorBoost;
      }
    }
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
  scene.add(root);
  const s = beach.stranger;
  const S = V(STRANGER.x, 0, STRANGER.z);
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
      [0, 4, { p: V(S.x - 7, 2.4, S.z - 5), l: V(S.x, 1.6, S.z) }, { p: V(S.x - 5.5, 2.2, S.z - 4), l: V(S.x, 1.6, S.z) }], // 神秘人背影
      [4, 9, { p: V(S.x - 1.6, 2.6, S.z - 2.6), l: V(S.x, 2.5, S.z) }, { p: V(S.x - 1.2, 2.6, S.z - 2.0), l: V(S.x, 2.5, S.z) }], // 佢轉身
      [9, 14, { p: V(S.x - 1.4, 2.5, S.z - 5.6), l: V(S.x - 1.6, 2.1, S.z - 1.2) }, { p: V(S.x - 1.2, 2.5, S.z - 5.0), l: V(S.x - 1.6, 2.1, S.z - 1.2) }], // 兩個人
      [14, 20, { p: V(S.x - 9, 3, S.z - 1), l: V(S.x + 30, 22, S.z - 4) }, { p: V(S.x - 10, 2.6, S.z - 1), l: V(S.x + 30, 30, S.z - 4) }], // 一齊坐低睇流星雨
    ],
    captions: [
      [0.3, 'Far away on the secret beach, someone was watching the stars...'],
      [14, 'And from that night on, they protected the animals together.'],
    ],
    lines: [
      [1.8, 4, () => s.head, '...', 'ranger'],
      [5, 8.8, () => s.head, 'So YOU are the ranger who saved all the animals!', 'ranger'],
      [9.2, 11.4, () => me.head, 'Who are you?', 'ranger'],
      [11.6, 14, () => s.head, "A ranger too! Let's protect them TOGETHER! 🤝", 'ranger'],
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
