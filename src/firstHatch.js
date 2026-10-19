// 第一隻寵物出世動畫（小朋友 2026-10-18；2026-10-19 小朋友話「好樣衰」→ 重做成預告片咁）：一世人得一次
// 鏡頭慢慢推近發緊光嘅繁殖機 → 特寫敲玻璃（裂紋真係喺玻璃面上、一條條分叉，光由裂縫射出嚟）
// → 玻璃爆開（閃光、碎片、彩紙、地面衝擊波）→ 低角度：寵物彈出嚟 → 遠鏡：圍住你跳圈圈 → 停喺你面前「ta-da」
// → 大字「🎉 YOUR FIRST PET!」（開始畫面款式）
// 繁殖機嘅玻璃喺動畫入面用一個複製品（可以裂、可以爆），真嗰個收埋，播完先擺返出嚟

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { play } from './sound.js';
import { state } from './state.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS, applyPetSkin } from './skins.js';
import { buildAnimalModel, flipUpsideDown } from './animalModels.js';
import { findAnimal, mutationList } from './data/animals.js';
import { rarityInfo } from './data/balance.js';
import { addFireAura } from './fireAura.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const GLASS_Y = 0.65; // 繁殖機玻璃半球嘅中心高度（hub.js buildMachine）
const GLASS_R = 1.2;
const KNOCK_AT = 1.95; // 你企喺離部機中心幾遠敲玻璃

// ---- 時間表（秒）----
const WALK_END = 2.5;
const KNOCKS = [2.9, 3.6, 4.3];
const TENSION = 4.8; // 玻璃震、光愈嚟愈勁
const SHATTER = 5.5;
const LAND = 6.8; // 寵物落地
const CIRCLE_END = 10.8; // 跳完圈
const TADA = 11.6; // 停喺你面前跳一跳
const CARD = 12.3; // 大字卡
const LENGTH = 14.3;

// 心心形狀（寵物開心時飄出嚟）
function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.12);
  s.bezierCurveTo(-0.02, -0.08, -0.16, 0, -0.16, 0.08);
  s.bezierCurveTo(-0.16, 0.16, -0.06, 0.2, 0, 0.12);
  s.bezierCurveTo(0.06, 0.2, 0.16, 0.16, 0.16, 0.08);
  s.bezierCurveTo(0.16, 0, 0.02, -0.08, 0, -0.12);
  return new THREE.ShapeGeometry(s);
}

// 寵物模型（皮膚、變異、倒轉都跟返）；fit = 最長嗰邊幾長
function petModel(pet, fit) {
  const model = buildAnimalModel(findAnimal(pet.name));
  applyPetSkin(model, state.petSkin);
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.multiplyScalar(fit / Math.max(size.x, size.y, size.z, 0.01));
  let body = model;
  if (pet.flipped) {
    body = new THREE.Group();
    body.add(flipUpsideDown(model));
    body.userData.noFireAura = model.userData.noFireAura;
  }
  for (const m of mutationList(pet)) addFireAura(body, m);
  const squash = new THREE.Group(); // 用嚟壓扁／拉長（彈跳）
  squash.add(body);
  const g = new THREE.Group();
  g.add(squash);
  return { g, squash, model };
}

// 一堆點（閃粉／彩紙）：每粒自己有速度，可以重新噴
function burst(root, count, size, colors) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const vel = Array.from({ length: count }, () => V(0, 0, 0));
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    c.set(colors[i % colors.length]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  root.add(pts);
  return {
    mat,
    fire(from, speed, up = 0.4) {
      for (let i = 0; i < count; i++) {
        pos.set([from.x, from.y, from.z], i * 3);
        const az = Math.random() * Math.PI * 2;
        const el = Math.random() * 1.4;
        vel[i].set(Math.sin(az) * Math.cos(el), Math.sin(el) + up, Math.cos(az) * Math.cos(el)).multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      }
      geo.attributes.position.needsUpdate = true;
    },
    step(dt, gravity, drag = 1) {
      for (let i = 0; i < count; i++) {
        const v = vel[i];
        v.y -= gravity * dt;
        v.multiplyScalar(1 - (1 - drag) * dt * 4);
        pos[i * 3] += v.x * dt;
        pos[i * 3 + 1] = Math.max(0.03, pos[i * 3 + 1] + v.y * dt);
        pos[i * 3 + 2] += v.z * dt;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// 大字卡（同開始畫面一樣：奶油色卡、白邊綠圈、粗字黑邊、彈出嚟）
function showCard(pet, color) {
  if (!$('first-pet-style')) {
    const st = document.createElement('style');
    st.id = 'first-pet-style';
    st.textContent = `@keyframes firstPetIn { 0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; } 60% { transform: translate(-50%, -50%) scale(1.12) rotate(2deg); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; } }
@keyframes firstPetBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.id = 'first-pet-card';
  el.style.cssText = `position:fixed;left:50%;top:24%;z-index:10050;pointer-events:none;text-align:center;
    font-family:'Fredoka','Trebuchet MS',sans-serif;padding:14px 30px 16px;border-radius:28px;border:5px solid #fff;
    background:linear-gradient(180deg,#fffef8 0%,#f1f8e9 100%);
    box-shadow:0 0 0 4px rgba(27,94,32,0.65),0 7px 0 rgba(0,0,0,0.28),0 0 46px ${color};
    animation:firstPetIn 0.7s cubic-bezier(.2,1.4,.4,1) both;`;
  const rarity = rarityInfo(pet.rarity).name;
  el.innerHTML = `<div style="font-size:clamp(26px,4vw,48px);font-weight:700;color:#ffd54f;-webkit-text-stroke:7px #0b2a12;paint-order:stroke fill;text-shadow:0 6px 0 rgba(0,0,0,0.3);animation:firstPetBob 1.2s ease-in-out infinite;letter-spacing:1px;white-space:nowrap">🎉 YOUR FIRST PET!</div>
    <div style="margin-top:6px;font-size:clamp(18px,2.4vw,28px);font-weight:700;color:#fff;-webkit-text-stroke:5px #0b2a12;paint-order:stroke fill">${pet.name}</div>
    <div style="display:inline-block;margin-top:8px;padding:4px 16px;border-radius:99px;border:3px solid #fff;background:${color};box-shadow:0 4px 0 rgba(0,0,0,0.25);font-size:clamp(14px,1.8vw,20px);font-weight:700;color:#fff;-webkit-text-stroke:4px #0b2a12;paint-order:stroke fill">★ ${rarity} ★</div>`;
  document.body.appendChild(el);
  return el;
}

// machine：hub.machines 入面嗰部（有 x、z、glass）；pet：啱啱收到嗰隻（collectPet 回傳嘅第一隻）
export function playFirstHatch({ scene, camera, machine, pet, onDone }) {
  const root = new THREE.Group();
  scene.add(root);
  const color = rarityInfo(pet.rarity).color;
  const rc = new THREE.Color(color);
  const M = V(machine.x, 0, machine.z);
  // 繁殖機正面向 -z（Hub 中間）：由正面行埋去，兩邊嘅喉喺後面唔會擋鏡
  const u = V(0, 0, -1);
  const s = V(u.z, 0, -u.x); // 側邊
  const at = (a, b = 0, y = 0) => M.clone().addScaledVector(u, a).addScaledVector(s, b).setY(y);
  const center = V(M.x, GLASS_Y, M.z);
  const K = at(KNOCK_AT); // 敲玻璃嘅位
  const START = at(5.6, 0.4);
  const faceTo = (obj, dx, dz) => (obj.rotation.y = Math.atan2(-dx, -dz)); // 公仔正面係 -z

  // ---- 你（Minecraft 款：硬手硬腳）----
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === state.rangerSkin) || RANGER_SKINS[0]);
  me.g.position.copy(START);
  faceTo(me.g, -u.x, -u.z);
  root.add(me.g);
  const pose = { la: 0, ra: 0, ll: 0, rl: 0, laz: 0, raz: 0, head: 0, y: 0 };
  const applyPose = () => {
    me.arms[0].rotation.set(pose.la, 0, pose.laz);
    me.arms[1].rotation.set(pose.ra, 0, pose.raz);
    me.legs[0].rotation.set(pose.ll, 0, 0);
    me.legs[1].rotation.set(pose.rl, 0, 0);
    me.knees?.forEach((k) => k.rotation.set(0, 0, 0));
    me.elbows?.forEach((e) => e.rotation.set(0, 0, 0));
    me.head.rotation.x = pose.head;
    me.g.position.y = pose.y;
  };

  // ---- 假玻璃（真嗰個收埋），帶少少稀有度顏色 ----
  if (machine.glass) machine.glass.visible = false;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd6f4ff, transparent: true, opacity: 0.34, roughness: 0.04, metalness: 0.1, emissive: rc, emissiveIntensity: 0.08, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(GLASS_R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  glass.position.copy(center);
  root.add(glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(GLASS_R * 0.98, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(center).setY(GLASS_Y + 0.02);
  root.add(rim);

  // ---- 機入面：發光剪影 + 一盞稀有度顏色嘅燈 ----
  const shadow = petModel(pet, 1.25);
  const glowMat = new THREE.MeshBasicMaterial({ color: rc.clone().multiplyScalar(0.55), transparent: true, opacity: 0.95 });
  shadow.g.traverse((o) => {
    if (o.isPoints || o.isSprite) o.visible = false;
    else if (o.isMesh) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      // 光暈、閃粉呢啲半透明／發光片唔好變剪影（會變咗一嚿四方嘢）
      if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.9) || m.isMeshBasicMaterial)) o.visible = false;
      else o.material = glowMat;
    }
  });
  const sBox = new THREE.Box3().setFromObject(shadow.g);
  shadow.g.position.set(M.x, GLASS_Y + 0.02 - sBox.min.y, M.z);
  root.add(shadow.g);
  const innerLight = new THREE.PointLight(rc, 3, 6, 1.5);
  innerLight.position.copy(center).add(V(0, 0.5, 0));
  root.add(innerLight);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(GLASS_R * 0.92, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.copy(center);
  root.add(halo);

  // ---- 裂紋：由手敲落嘅位開始，喺玻璃面上分叉咁爬開 ----
  const crackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
  const crackGroup = new THREE.Group();
  root.add(crackGroup);
  const crackTips = []; // 裂紋尾（光由呢度射出嚟）
  const onSphere = (dir) => dir.clone().normalize().multiplyScalar(GLASS_R + 0.006).add(center);
  // 由 dir（單位向量）沿住玻璃面行 steps 步；每步可能分叉
  const growCrack = (dir, heading, steps, width, depth = 0) => {
    let d = dir.clone();
    let h = heading.clone();
    for (let i = 0; i < steps; i++) {
      // h 要同 d 垂直（貼住玻璃面），每步轉少少
      h.addScaledVector(d, -h.dot(d)).normalize();
      const turn = new THREE.Quaternion().setFromAxisAngle(d, (Math.random() - 0.5) * 0.9);
      h.applyQuaternion(turn);
      const len = 0.09 + Math.random() * 0.12;
      const next = d.clone().addScaledVector(h, len / GLASS_R).normalize();
      if (next.y < 0.04) break; // 唔好爬出玻璃底
      const a = onSphere(d);
      const b = onSphere(next);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(width, 0.006, a.distanceTo(b) + width * 0.5), crackMat);
      seg.position.copy(a).add(b).multiplyScalar(0.5);
      seg.lookAt(b);
      crackGroup.add(seg);
      d = next;
      if (depth < 2 && Math.random() < 0.28) {
        const side = h.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(d, (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6)));
        growCrack(d, side, Math.max(2, Math.floor((steps - i) * 0.6)), width * 0.7, depth + 1);
      }
    }
    crackTips.push(d.clone());
  };
  let impact = null; // 第一下敲落嘅位（玻璃面上嘅方向）
  const handPos = () => {
    const p = V(0, -0.85, 0);
    me.arms[1].localToWorld(p);
    return p;
  };
  const crackBurst = (n) => {
    const count = [5, 7, 10][n];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      // impact 嘅切面方向
      const t1 = V(0, 1, 0).addScaledVector(impact, -impact.y).normalize();
      const t2 = impact.clone().cross(t1).normalize();
      const head = t1.multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
      growCrack(impact, head, 3 + n * 3 + Math.floor(Math.random() * 3), 0.028 - n * 0.003);
    }
  };
  // 光柱：由裂縫射出嚟（稀有度顏色）
  const rayMat = new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rays = [];
  const addRays = (n) => {
    for (let i = 0; i < n; i++) {
      const tip = crackTips[Math.floor(Math.random() * crackTips.length)] || impact;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.045, 1, 8, 1, true), rayMat);
      ray.geometry.translate(0, -0.5, 0);
      ray.geometry.rotateX(-Math.PI / 2); // 尖嗰頭喺原點，向 +z 伸出去
      const holder = new THREE.Object3D();
      holder.position.copy(onSphere(tip));
      holder.lookAt(onSphere(tip).add(tip));
      holder.add(ray);
      root.add(holder);
      rays.push({ holder, ray, len: 0.35 + Math.random() * 0.75, p: Math.random() * 6 });
    }
  };

  // ---- 玻璃碎（扁三角形，識轉、識跌、慢慢透明）----
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xe1f5fe, transparent: true, opacity: 0.85, roughness: 0.02, metalness: 0.2, emissive: 0x9be7ff, emissiveIntensity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const shards = Array.from({ length: 70 }, () => {
    const sz = 0.08 + Math.random() * 0.2;
    const shape = new THREE.Shape([new THREE.Vector2(0, sz), new THREE.Vector2(-sz * (0.4 + Math.random() * 0.6), -sz * 0.6), new THREE.Vector2(sz * (0.4 + Math.random() * 0.6), -sz * (0.3 + Math.random() * 0.5))]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), shardMat);
    const az = Math.random() * Math.PI * 2;
    const el = 0.05 + Math.random() * 1.45;
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    m.userData.home = dir.clone().multiplyScalar(GLASS_R).add(center);
    m.visible = false;
    root.add(m);
    return { m, v: dir.multiplyScalar(3.5 + Math.random() * 6).add(V(0, 2 + Math.random() * 4, 0)), spin: V(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7), rest: false };
  });

  // ---- 閃粉、彩紙、衝擊波、閃光球 ----
  const sparkles = burst(root, 220, 0.18, ['#ffffff', '#fff59d', color]);
  const confetti = burst(root, 160, 0.28, [color, '#ffd54f', '#69f0ae', '#ff80ab', '#80d8ff']);
  const petSparkle = burst(root, 40, 0.14, ['#ffffff', color]);
  const ringMat = new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(M).setY(0.08);
  root.add(ring);
  const ring2 = ring.clone();
  ring2.material = ringMat.clone();
  ring2.material.color = new THREE.Color(0xffffff);
  root.add(ring2);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), flashMat);
  flash.position.copy(center).setY(GLASS_Y + 0.5);
  root.add(flash);
  const flashLight = new THREE.PointLight(0xffffff, 0, 14, 1.5);
  flashLight.position.copy(flash.position);
  root.add(flashLight);

  // ---- 真寵物（爆出嚟嗰隻）----
  const fit = Math.min(3.0, 1.6 * (pet.sizeMul > 1 ? 1.4 : pet.sizeMul && pet.sizeMul < 1 ? 0.75 : 1));
  const real = petModel(pet, fit);
  real.g.visible = false;
  root.add(real.g);
  const ground = new THREE.Box3().setFromObject(real.g).min.y; // 企喺地面要抬幾多
  const R = 2.25; // 跳圈半徑
  const landAt = K.clone().addScaledVector(s, -R); // 落喺你側邊
  const finalAt = K.clone().addScaledVector(u, 1.7).addScaledVector(s, -0.15); // 最後停喺你前面（鏡頭嗰邊）
  let squashT = -9; // 上一次落地嘅時間（壓扁再彈返）

  // ---- 心心 ----
  const heartGeo = heartGeometry();
  const hearts = Array.from({ length: 14 }, () => {
    const h = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    h.scale.setScalar(1.8);
    root.add(h);
    return { h, life: 0 };
  });
  let nextHeart = 0;
  const emitHeart = (p) => {
    const h = hearts.find((x) => x.life <= 0);
    if (!h) return;
    h.life = 1.5;
    h.h.position.copy(p).add(V((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7));
  };

  // ---- 鏡頭 ----
  const shots = [
    // 1. 慢慢推近：你行向發緊光嘅繁殖機
    [0, WALK_END, { p: at(9.4, -3.4, 3.4), l: at(0.6, 0, 1.0) }, { p: at(5.4, -2.3, 2.3), l: at(0.3, 0, 1.05) }],
    // 2. 特寫：手敲玻璃（側前面，避開後面兩條喉）
    [WALK_END, TENSION, { p: at(3.9, -3.1, 2.7), l: at(0.95, 0.35, 1.2) }, { p: at(3.5, -2.8, 2.5), l: at(0.95, 0.35, 1.2) }],
    // 3. 就嚟爆：再推近，震震震
    [TENSION, SHATTER, { p: at(3.5, -2.8, 2.5), l: at(0.95, 0.35, 1.2) }, { p: at(3.0, -2.4, 2.2), l: at(0.8, 0.3, 1.1) }],
    // 4. 低角度：爆開、寵物飛上天
    [SHATTER, LAND, { p: at(3.4, -4.6, 0.45), l: at(0.4, -0.6, 2.4) }, { p: at(3.8, -5.0, 0.5), l: at(1.4, -1.8, 1.5) }],
    // 5. 遠鏡：慢慢兜圈，影住佢圍住你跳（由 update 計）
    // 6. 停喺你面前：正面中鏡
    [TADA - 0.6, LENGTH + 1, { p: at(KNOCK_AT + 7.4, 1.2, 2.5), l: at(KNOCK_AT + 1.2, 0, 1.75) }, { p: at(KNOCK_AT + 6.6, 0.8, 2.3), l: at(KNOCK_AT + 1.1, 0, 1.85) }],
  ];
  const fade = $('movie-fade');
  let card = null;
  const oldFov = camera.fov;
  camera.fov = 55; // 電影感：窄啲嘅鏡頭，少啲旁邊嘅嘢入鏡
  camera.updateProjectionMatrix();

  playMovie(camera, {
    length: LENGTH,
    shots,
    captions: [
      [0.3, 'Something is moving inside... 💗'],
      [KNOCKS[0] - 0.1, 'Knock knock... 🥚'],
      [TENSION, 'CRACK!'],
      [SHATTER, ''],
      [CIRCLE_END, 'Your first pet is here! Take good care of it! 🎉'],
      [CARD, ''],
    ],
    lines: [
      [0.5, 2.3, () => me.head, 'Hello in there? Time to come out!', 'ranger'],
      [LAND + 0.4, LAND + 2.6, () => me.head, 'Whoa! You are SO fast! 😆', 'ranger'],
      [TADA, CARD, () => me.head, `Hi little ${pet.name}! Welcome to the family!`, 'ranger'],
    ],
    update(t, dt) {
      // ================= 你 =================
      const pos = me.g.position;
      pose.la = pose.ra = pose.ll = pose.rl = pose.laz = pose.raz = pose.head = pose.y = 0;
      if (t < WALK_END) {
        const k = smooth(clamp01(t / (WALK_END - 0.2)));
        pos.lerpVectors(START, K, k);
        const moving = k < 0.999 ? 1 : 0;
        const sw = Math.sin(t * 9) * 0.6 * moving;
        pose.ll = sw;
        pose.rl = -sw;
        pose.la = -sw;
        pose.ra = sw;
        pose.y = Math.abs(Math.sin(t * 9)) * 0.05 * moving;
        faceTo(me.g, -u.x, -u.z);
      } else if (t < SHATTER) {
        pos.copy(K);
        faceTo(me.g, -u.x, -u.z);
        // 右手打直向前，每下快快撞一撞
        const knock = KNOCKS.reduce((k, kt) => (t >= kt - 0.18 && t < kt + 0.22 ? (t < kt ? 1 - (kt - t) / 0.18 : 1 - (t - kt) / 0.22) : k), 0);
        const raise = smooth(clamp01((t - WALK_END) / 0.3));
        pose.ra = (0.85 + knock * 0.22) * raise;
        pose.raz = 0.06;
        pose.head = 0.1;
        if (t > TENSION) {
          // 退後半步，雙手微微舉起，望住部機（嚇親）
          const k = smooth(clamp01((t - TENSION) / 0.4));
          pos.addScaledVector(u, 0.35 * k);
          pose.ra = 0.85 * (1 - k) + 0.5 * k;
          pose.la = 0.5 * k;
          pose.head = 0.1 - 0.15 * k;
        }
      } else if (t < LAND) {
        // 嚇一跳：雙手打直舉高，跳少少
        pos.copy(K).addScaledVector(u, 0.35);
        const k = smooth(clamp01((t - SHATTER) / 0.25));
        pose.la = pose.ra = 2.9 * k;
        pose.laz = -0.25 * k;
        pose.raz = 0.25 * k;
        pose.y = Math.max(0, Math.sin(clamp01((t - SHATTER) / 0.45) * Math.PI)) * 0.25;
        pose.head = -0.25 * k;
      }

      // ================= 部機：剪影發光、燈閃 =================
      const tension = clamp01((t - TENSION) / (SHATTER - TENSION));
      const pulse = 0.5 + 0.5 * Math.sin(t * (4 + tension * 14));
      if (t < SHATTER) {
        glowMat.color.copy(rc).multiplyScalar(0.45 + pulse * 0.45 + tension * 0.4);
        innerLight.intensity = 2 + pulse * 2 + tension * 10;
        halo.material.opacity = 0.08 + pulse * 0.08 + tension * 0.25;
        glassMat.emissiveIntensity = 0.06 + pulse * 0.06 + tension * 0.4;
        shadow.g.rotation.y = t * 0.8;
        shadow.g.position.y = GLASS_Y + 0.02 - sBox.min.y + (t > KNOCKS[0] ? Math.abs(Math.sin(t * 9)) * 0.08 : 0) + tension * Math.abs(Math.sin(t * 22)) * 0.12;
        shadow.model.userData.animate?.(t, t > KNOCKS[0] ? 0.6 : 0);
      }

      // ================= 敲玻璃：出聲、震、裂紋、光柱 =================
      KNOCKS.forEach((kt, i) => {
        if (t >= kt && once(`knock${i}`)) {
          me.g.updateMatrixWorld(true);
          if (!impact) impact = handPos().sub(center).normalize();
          crackBurst(i);
          if (i >= 1) addRays(i === 1 ? 3 : 6);
          play('knock');
          if (i === 2) play('crystal');
          shake(0.06 + i * 0.05);
        }
      });
      const wob = KNOCKS.reduce((w, kt) => (t >= kt && t < kt + 0.45 ? Math.sin((t - kt) * 55) * (0.45 - (t - kt)) * 0.1 : w), 0);
      const jitter = tension > 0 ? Math.sin(t * 95) * 0.025 * tension : 0;
      glass.scale.set(1 + wob, 1 - wob * 0.5, 1 + wob);
      crackGroup.scale.copy(glass.scale);
      glass.position.set(center.x + jitter, center.y, center.z);
      crackGroup.position.set(jitter, 0, 0);
      crackMat.color.setRGB(1, 1, 1).lerp(rc, tension * 0.4);
      for (const r of rays) {
        const grow = 0.6 + 0.4 * Math.sin(t * 7 + r.p);
        r.ray.scale.set(1 + tension * 0.6, 1 + tension * 0.6, r.len * (0.5 + grow * 0.5) * (1 + tension));
      }
      rayMat.opacity = t < SHATTER ? 0.22 + tension * 0.3 : Math.max(0, 0.5 - (t - SHATTER) * 3);
      if (t >= TENSION && once('tension')) {
        play('rumble');
        play('drumroll');
        shake(0.15);
      }
      if (t > TENSION && t < SHATTER) shake(0.04 + tension * 0.1);

      // ================= 爆！ =================
      if (t >= SHATTER && once('shatter')) {
        glass.visible = false;
        rim.visible = false;
        crackGroup.visible = false;
        shadow.g.visible = false;
        halo.visible = false;
        shards.forEach((p) => {
          p.m.visible = true;
          p.m.position.copy(p.m.userData.home);
          p.m.lookAt(center);
        });
        sparkles.fire(center.clone().setY(GLASS_Y + 0.4), 7);
        confetti.fire(center.clone().setY(GLASS_Y + 0.6), 6, 0.9);
        real.g.visible = true;
        play('boom');
        play('crystal');
        play('tierUp');
        shake(0.55);
        fade.style.background = '#fff';
        fade.style.transition = 'none';
        fade.style.opacity = 0.75;
        setTimeout(() => {
          fade.style.transition = 'opacity 0.5s ease-out';
          fade.style.opacity = 0;
          setTimeout(() => {
            fade.style.background = '#000';
            fade.style.transition = '';
          }, 600);
        }, 90);
      }
      if (t >= SHATTER) {
        const age = t - SHATTER;
        // 閃光球 + 燈
        flash.scale.setScalar(0.6 + age * 6);
        flashMat.opacity = Math.max(0, 0.75 - age * 4);
        flashLight.intensity = Math.max(0, 40 * (1 - age * 2.5));
        innerLight.intensity = Math.max(0, 14 * (1 - age * 2));
        // 衝擊波（兩圈）
        ring.scale.setScalar(1 + age * 9);
        ringMat.opacity = Math.max(0, 0.9 - age * 1.3);
        ring2.scale.setScalar(1 + Math.max(0, age - 0.12) * 6.5);
        ring2.material.opacity = age > 0.12 ? Math.max(0, 0.7 - (age - 0.12) * 1.2) : 0;
        // 碎片
        for (const p of shards) {
          if (!p.rest) {
            p.v.y -= 16 * dt;
            p.m.position.addScaledVector(p.v, dt);
            p.m.rotation.x += p.spin.x * dt;
            p.m.rotation.y += p.spin.y * dt;
            p.m.rotation.z += p.spin.z * dt;
            if (p.m.position.y < 0.04) {
              p.m.position.y = 0.04;
              p.v.multiplyScalar(0.35);
              p.v.y = Math.abs(p.v.y) * 0.4;
              p.spin.multiplyScalar(0.4);
              if (p.v.length() < 0.6) p.rest = true;
            }
          }
        }
        shardMat.opacity = Math.max(0, 0.85 - Math.max(0, age - 2.6) * 0.45);
        sparkles.step(dt, 4, 0.7);
        sparkles.mat.opacity = Math.max(0, 1 - age / 1.6);
        confetti.step(dt, 3.2, 0.55);
        confetti.mat.opacity = Math.max(0, 1 - Math.max(0, age - 2.2) / 2);
      }

      // ================= 寵物：彈出嚟 → 跳圈圈 → 停喺你面前 =================
      const g = real.g;
      const sq = real.squash;
      let moving = 0;
      if (t >= SHATTER) {
        if (t < LAND) {
          // 拋物線飛出嚟，半空轉一個圈，拉長
          const k = (t - SHATTER) / (LAND - SHATTER);
          const p = center.clone().lerp(landAt, smooth(k));
          g.position.set(p.x, -ground + GLASS_Y + Math.sin(k * Math.PI) * 3.6 - k * GLASS_Y, p.z);
          g.rotation.y = Math.atan2(-(landAt.x - center.x), -(landAt.z - center.z)) + k * Math.PI * 2;
          const st = 1 + Math.sin(k * Math.PI) * 0.18;
          sq.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
          if (t > LAND - 0.04 && once('land')) {
            play('boing');
            shake(0.12);
            squashT = t;
          }
        } else if (t < CIRCLE_END) {
          // 圍住你跳 2 個圈：一下一下彈，面向跳緊嘅方向
          const k = (t - LAND) / (CIRCLE_END - LAND);
          const startAng = Math.atan2(landAt.x - K.x, landAt.z - K.z);
          const ang = startAng + smooth(k) * Math.PI * 2 * 2;
          const p = K.clone().add(V(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(R));
          const HOP = 0.5;
          const hk = ((t - LAND) % HOP) / HOP;
          const hop = Math.sin(hk * Math.PI);
          g.position.set(p.x, -ground + hop * 0.85, p.z);
          const tangent = V(Math.cos(ang), 0, -Math.sin(ang));
          g.rotation.y = Math.atan2(-tangent.x, -tangent.z);
          const st = 1 + hop * 0.14;
          sq.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
          const hopIdx = Math.floor((t - LAND) / HOP);
          if (hk < 0.12 && once(`hop${hopIdx}`)) {
            squashT = t;
            if (hopIdx % 2 === 0) play('boing');
          }
          moving = 1;
          // 你轉身跟住佢，開心到雙手舉高
          pos.copy(K).addScaledVector(u, 0.35);
          faceTo(me.g, p.x - pos.x, p.z - pos.z);
          const cheer = 0.5 + 0.5 * Math.sin((t - LAND) * 4);
          pose.la = pose.ra = 2.4 + cheer * 0.5;
          pose.laz = -0.2;
          pose.raz = 0.2;
          pose.y = Math.abs(Math.sin((t - LAND) * 4)) * 0.12;
        } else {
          // 走去你前面，面向鏡頭；TADA 嗰下跳高高轉一個圈
          const k = smooth(clamp01((t - CIRCLE_END) / (TADA - CIRCLE_END)));
          const endAng = Math.atan2(landAt.x - K.x, landAt.z - K.z) + Math.PI * 4;
          const from = K.clone().add(V(Math.sin(endAng), 0, Math.cos(endAng)).multiplyScalar(R));
          const p = from.lerp(finalAt, k);
          let y = Math.sin(clamp01((t - CIRCLE_END) / (TADA - CIRCLE_END)) * Math.PI) * 0.4;
          let spin = 0;
          if (t >= TADA) {
            const jk = clamp01((t - TADA) / 0.7);
            y = Math.sin(jk * Math.PI) * 1.5;
            spin = smooth(jk) * Math.PI * 2;
            if (once('tada')) {
              play('magic');
              petSparkle.fire(p.clone().setY(fit * 0.6), 4, 0.6);
            }
            if (jk >= 1 && once('tadaLand')) squashT = t;
            if (t > TADA + 0.9) y = Math.abs(Math.sin((t - TADA - 0.9) * 4)) * 0.18; // 之後細細跳
          }
          g.position.set(p.x, -ground + y, p.z);
          g.rotation.y = Math.atan2(-u.x, -u.z) + Math.PI + spin; // 面向鏡頭
          const st = 1 + Math.min(0.2, y * 0.12);
          sq.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
          moving = k < 1 ? 1 : 0.3;
          // 你：轉返出嚟，TADA 嗰下雙手舉高歡呼
          pos.copy(K).addScaledVector(u, 0.35).addScaledVector(s, 0.55);
          faceTo(me.g, u.x * 0.7 + s.x * -0.3, u.z * 0.7 + s.z * -0.3);
          const ck = t >= TADA ? smooth(clamp01((t - TADA) / 0.3)) : 0;
          pose.la = pose.ra = 0.1 + ck * 2.95;
          pose.laz = -0.15 * ck;
          pose.raz = 0.15 * ck;
          pose.y = t >= TADA ? Math.abs(Math.sin((t - TADA) * 5)) * 0.12 * ck : 0;
        }
        // 落地壓扁再彈返（蓋過上面嘅拉長）
        const sa = t - squashT;
        if (sa >= 0 && sa < 0.32) {
          const e = Math.sin((sa / 0.32) * Math.PI) * (1 - sa / 0.32);
          sq.scale.set(1 + e * 0.35, 1 - e * 0.3, 1 + e * 0.35);
        }
        real.model.userData.animate?.(t, moving);
        // 心心 + 閃粉
        if (t >= LAND && t >= nextHeart) {
          nextHeart = t + 0.32;
          emitHeart(g.position.clone().setY(g.position.y + fit * 0.85 + 0.2));
        }
      }
      petSparkle.step(dt, 2, 0.6);
      petSparkle.mat.opacity = t >= TADA ? Math.max(0, 1 - (t - TADA) / 1.4) : 0;
      for (const h of hearts) {
        if (h.life <= 0) {
          h.h.material.opacity = 0;
          continue;
        }
        h.life -= dt;
        h.h.position.y += dt * 1.1;
        h.h.material.opacity = Math.min(1, h.life * 1.5);
        h.h.quaternion.copy(camera.quaternion);
      }
      applyPose();

      // ================= 大字卡 =================
      if (t >= CARD && !card) {
        card = showCard(pet, color);
        play('ding');
      }

      // 遠鏡：慢慢兜圈影住你同隻寵物（冇 shot 嗰陣用呢個）
      if (t >= LAND && t < TADA - 0.6) {
        const k = (t - LAND) / (TADA - 0.6 - LAND);
        const a = -0.9 + k * 1.6;
        const dist = 6.4 - k * 0.8;
        // 以 K 為中心，喺正面半圈兜
        const p = K.clone().addScaledVector(u, Math.cos(a) * dist).addScaledVector(s, Math.sin(a) * dist).setY(3.3 - k * 0.6);
        return [p, K.clone().setY(0.9)];
      }
      return null;
    },
    onDone() {
      if (machine.glass) machine.glass.visible = true; // 真玻璃擺返出嚟
      camera.fov = oldFov;
      camera.updateProjectionMatrix();
      card?.remove();
      fade.style.background = '#000';
      fade.style.transition = '';
      fade.style.opacity = 0;
      scene.remove(root); // 唔好 dispose：啲動物形狀同遊戲共用
      onDone?.();
    },
  });
}
