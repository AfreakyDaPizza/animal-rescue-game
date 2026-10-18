// 第一隻寵物出世動畫（小朋友 2026-10-18）：一世人得一次
// 你行去繁殖機，敲 3 下玻璃 → 玻璃裂 → 爆開 → 寵物彈出嚟，喺你身邊跳圈圈 → 停喺你面前
// 繁殖機嘅玻璃喺動畫入面用一個複製品（可以裂、可以爆），真嗰個收埋，播完先擺返出嚟

import * as THREE from 'three';
import { playMovie, once, shake } from './movie.js';
import { play } from './sound.js';
import { state } from './state.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS, applyPetSkin } from './skins.js';
import { buildAnimalModel, flipUpsideDown } from './animalModels.js';
import { findAnimal, mutationList } from './data/animals.js';
import { addFireAura } from './fireAura.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);
const GLASS_Y = 0.65; // 繁殖機玻璃半球嘅中心高度（hub.js buildMachine）
const GLASS_R = 1.2;
const KNOCKS = [2.7, 3.45, 4.2]; // 敲玻璃嘅時間
const SHATTER = 5.1; // 玻璃爆開
const LAND = 6.5; // 寵物落地
const CIRCLE_END = 11.6; // 跳完圈
const LENGTH = 14.6;

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

// 寵物模型（皮膚、變異、倒轉、大細都跟返）
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
  const g = new THREE.Group();
  g.add(body);
  return { g, model };
}

// machine：hub.machines 入面嗰部（有 x、z、glass）；pet：啱啱收到嗰隻（collectPet 回傳嘅第一隻）
export function playFirstHatch({ scene, camera, machine, pet, from, onDone }) {
  const root = new THREE.Group();
  scene.add(root);
  const M = V(machine.x, 0, machine.z);
  // u：由繁殖機指向玩家嘅方向（玩家喺邊就由邊行埋去）
  const u = V(from.x - M.x, 0, from.z - M.z);
  if (u.lengthSq() < 0.01) u.set(0, 0, -1);
  u.normalize();
  const s = V(u.z, 0, -u.x); // 側邊
  const at = (a, b = 0, y = 0) => M.clone().addScaledVector(u, a).addScaledVector(s, b).setY(y);
  const K = at(1.95); // 敲玻璃嘅位
  const START = at(5.2);
  const faceTo = (obj, dx, dz) => (obj.rotation.y = Math.atan2(-dx, -dz)); // 公仔正面係 -z

  // 你（第三身公仔）
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === state.rangerSkin) || RANGER_SKINS[0]);
  me.g.position.copy(START);
  root.add(me.g);

  // 假玻璃（真嗰個收埋）
  if (machine.glass) machine.glass.visible = false;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.38, roughness: 0.05, emissive: 0x4fc3f7, emissiveIntensity: 0.15 });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(GLASS_R, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  glass.position.set(M.x, GLASS_Y, M.z);
  root.add(glass);

  // 裂紋：一條條白色幼線，貼住玻璃向住你嗰邊；敲一下多幾條
  const crackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const center = V(M.x, GLASS_Y, M.z);
  const baseAz = Math.atan2(u.x, u.z);
  const cracks = Array.from({ length: 15 }, (_, i) => {
    const az = baseAz + (Math.random() - 0.5) * 1.6;
    const el = 0.25 + Math.random() * 0.9;
    const p = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(GLASS_R + 0.01).add(center);
    const holder = new THREE.Object3D();
    holder.position.copy(p);
    holder.lookAt(center);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.28 + Math.random() * 0.4, 0.025, 0.01), crackMat);
    line.rotation.z = Math.random() * Math.PI;
    holder.add(line);
    holder.visible = false;
    root.add(holder);
    return { holder, step: i < 4 ? 0 : i < 9 ? 1 : 2 };
  });

  // 玻璃碎：爆開時向外飛、跌落地
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xe1f5fe, transparent: true, opacity: 0.8, roughness: 0.05, emissive: 0x81d4fa, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const shards = Array.from({ length: 44 }, () => {
    const az = Math.random() * Math.PI * 2;
    const el = Math.random() * 1.3;
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.14), shardMat);
    m.scale.set(1, 0.25, 1);
    m.position.copy(dir.clone().multiplyScalar(GLASS_R).add(center));
    m.visible = false;
    root.add(m);
    return { m, v: dir.multiplyScalar(4 + Math.random() * 5).add(V(0, 3 + Math.random() * 3, 0)), spin: V(Math.random() * 9, Math.random() * 9, Math.random() * 9) };
  });

  // 閃粉：爆開嗰下噴晒出嚟
  const SP = 140;
  const spPos = new Float32Array(SP * 3);
  const spVel = Array.from({ length: SP }, () => {
    const az = Math.random() * Math.PI * 2;
    const el = Math.random() * 1.4;
    return V(Math.sin(az) * Math.cos(el), Math.sin(el) + 0.3, Math.cos(az) * Math.cos(el)).multiplyScalar(2 + Math.random() * 6);
  });
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({ color: 0xfff59d, size: 0.16, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparkles = new THREE.Points(spGeo, spMat);
  sparkles.frustumCulled = false;
  root.add(sparkles);
  const resetSparkles = () => spVel.forEach((_, i) => spPos.set([center.x, center.y + 0.4, center.z], i * 3));
  resetSparkles();

  // 機入面嘅影（深色剪影，慢慢轉）
  const shadow = petModel(pet, 1.3);
  shadow.g.traverse((o) => {
    if (o.isMesh || o.isPoints) o.material = new THREE.MeshBasicMaterial({ color: 0x311b92, transparent: true, opacity: 0.85 });
  });
  shadow.g.position.set(M.x, 0.7, M.z);
  root.add(shadow.g);

  // 真寵物（爆出嚟嗰隻）
  const fit = Math.min(3.2, 1.7 * (pet.sizeMul > 1 ? 1.5 : pet.sizeMul && pet.sizeMul < 1 ? 0.75 : 1));
  const real = petModel(pet, fit);
  real.g.visible = false;
  root.add(real.g);
  const ground = new THREE.Box3().setFromObject(real.g).min.y; // 企喺地面
  const R = 2.3; // 跳圈半徑
  const startAng = Math.atan2(s.x, s.z); // 由你側邊開始
  const landAt = K.clone().addScaledVector(s, R);

  // 心心
  const heartGeo = heartGeometry();
  const hearts = Array.from({ length: 12 }, () => {
    const h = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    h.scale.setScalar(1.6);
    root.add(h);
    return { h, life: 0 };
  });
  let nextHeart = 0;
  const emitHeart = (p) => {
    const h = hearts.find((x) => x.life <= 0);
    if (!h) return;
    h.life = 1.4;
    h.h.position.copy(p).add(V((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));
  };

  // 鏡頭
  const shots = [
    [0, 2.2, { p: at(5.8, -2.6, 2.6), l: at(1.2, 0, 1.1) }, { p: at(5.2, -2.2, 2.4), l: at(1, 0, 1.1) }], // 你行埋去，部機發緊光
    [2.2, SHATTER, { p: at(1.0, 3.6, 1.6), l: at(1.0, 0, 1.15) }, { p: at(1.1, 3.2, 1.5), l: at(0.9, 0, 1.15) }], // 側面：敲玻璃
    [SHATTER, LAND, { p: at(6.8, -4.2, 4.2), l: at(1, 0, 2.6) }, { p: at(7.4, -4.6, 4.8), l: at(1.6, 0, 2.2) }], // 爆！
    [LAND, CIRCLE_END, { p: at(7.2, 2.2, 4.2), l: at(1.9, 0, 0.6) }, { p: at(7.2, -2.2, 4.6), l: at(1.9, 0, 0.6) }], // 喺你身邊跳圈圈
    [CIRCLE_END, LENGTH, { p: at(7.6, 1.2, 2.5), l: at(2.4, 0, 1.2) }, { p: at(7.0, 1.0, 2.3), l: at(2.4, 0, 1.2) }], // 停喺你面前
  ];
  const fade = $('movie-fade');
  const swing = (arm, k) => (arm.rotation.x = k);

  playMovie(camera, {
    length: LENGTH,
    shots,
    captions: [
      [0.3, 'Your first baby pet is ready... 💗'],
      [2.4, 'Knock knock... 🥚'],
      [4.5, 'CRACK!'],
      [SHATTER + 0.2, '💥'],
      [LAND, ''],
      [CIRCLE_END, 'Your first pet is here! 🎉 Take good care of it!'],
    ],
    lines: [
      [0.4, 2.2, () => me.head, 'Hello in there? Time to come out!', 'ranger'],
      [LAND + 0.4, LAND + 2.6, () => me.head, 'Whoa! You are SO fast! 😆', 'ranger'],
      [CIRCLE_END + 0.3, LENGTH, () => me.head, `Hi little ${pet.name}! Welcome to the family!`, 'ranger'],
    ],
    update(t, dt) {
      // ---- 你：行埋去 → 敲玻璃 → 望住隻寵物 ----
      const pos = me.g.position;
      let walking = false;
      if (t < 2.4) {
        const d = K.clone().sub(pos);
        d.y = 0;
        if (d.length() > 0.05) {
          pos.addScaledVector(d.normalize(), Math.min(d.length(), dt * 2.6));
          walking = true;
        }
        faceTo(me.g, -u.x, -u.z);
      }
      const walk = walking ? Math.sin(t * 10) * 0.7 : 0;
      me.legs[0].rotation.x = walk;
      me.legs[1].rotation.x = -walk;
      me.arms[0].rotation.x = -walk;
      me.arms[1].rotation.x = walk;
      if (t >= 2.4 && t < SHATTER) {
        faceTo(me.g, -u.x, -u.z);
        // 右手舉起，敲三下（每下快快向前撞一撞）
        const knock = KNOCKS.reduce((k, kt) => (t >= kt - 0.25 && t < kt + 0.25 ? 1 - Math.abs(t - kt) / 0.25 : k), 0);
        swing(me.arms[1], 1.45 + knock * 0.3); // 正數 = 向前（以前係負數，隻手向後敲）
        me.arms[1].rotation.z = 0.15;
        me.head.rotation.x = 0.12;
      }
      if (t >= SHATTER) {
        me.arms[1].rotation.z = 0;
        me.head.rotation.x = 0;
      }
      if (t >= SHATTER && t < LAND) {
        // 嚇一跳：雙手舉高、身向後
        const k = Math.min(1, (t - SHATTER) / 0.3);
        swing(me.arms[0], 2.9 * k); // 嚇一跳：雙手打直舉高（向前少少）
        swing(me.arms[1], 2.9 * k);
        me.g.rotation.x = 0;
      }

      // ---- 敲玻璃：出聲、玻璃震、裂紋 ----
      KNOCKS.forEach((kt, i) => {
        if (t >= kt && once(`knock${i}`)) {
          play('knock');
          shake(0.05 + i * 0.05);
          for (const c of cracks) if (c.step <= i) c.holder.visible = true;
        }
      });
      const wob = KNOCKS.reduce((w, kt) => (t >= kt && t < kt + 0.4 ? Math.sin((t - kt) * 60) * (0.4 - (t - kt)) * 0.12 : w), 0);
      glass.scale.set(1 + wob, 1 - wob * 0.5, 1 + wob);
      if (t > 4.5 && t < SHATTER) glass.position.x = M.x + Math.sin(t * 90) * 0.03; // 就嚟爆：震震震
      if (t >= 4.5 && once('crackSound')) {
        play('crystal');
        shake(0.2);
      }

      // 機入面個影：轉下轉下，敲玻璃時跳一跳
      if (shadow.g.visible) {
        shadow.g.rotation.y = t * 0.9;
        shadow.g.position.y = 0.7 + (t > 4.3 ? Math.abs(Math.sin(t * 14)) * 0.15 : 0);
        shadow.model.userData.animate?.(t, 0);
      }

      // ---- 爆！ ----
      if (t >= SHATTER && once('shatter')) {
        glass.visible = false;
        for (const c of cracks) c.holder.visible = false;
        shadow.g.visible = false;
        shards.forEach((p) => (p.m.visible = true));
        spMat.opacity = 1;
        real.g.visible = true;
        play('boom');
        play('crystal');
        play('tierUp');
        shake(0.5);
        fade.style.background = '#fff';
        fade.style.opacity = 0.85;
        setTimeout(() => {
          fade.style.opacity = 0;
          setTimeout(() => (fade.style.background = '#000'), 600);
        }, 120);
      }
      if (t >= SHATTER) {
        const age = t - SHATTER;
        for (const p of shards) {
          if (!p.m.visible) continue;
          p.v.y -= 18 * dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.rotation.x += p.spin.x * dt;
          p.m.rotation.y += p.spin.y * dt;
          if (p.m.position.y < 0.05) {
            p.m.position.y = 0.05;
            p.v.multiplyScalar(0.3);
            p.v.y = Math.abs(p.v.y) * 0.3;
            p.spin.multiplyScalar(0.5);
          }
        }
        shardMat.opacity = Math.max(0, 0.8 - Math.max(0, age - 3.5) * 0.5);
        spVel.forEach((v, i) => {
          v.y -= 3 * dt;
          spPos[i * 3] += v.x * dt;
          spPos[i * 3 + 1] += v.y * dt;
          spPos[i * 3 + 2] += v.z * dt;
        });
        spGeo.attributes.position.needsUpdate = true;
        spMat.opacity = Math.max(0, 1 - age / 1.8);
      }

      // ---- 寵物：彈出嚟（拋物線）→ 跳圈圈 → 停喺你面前 ----
      if (t >= SHATTER) {
        const g = real.g;
        let moving = 1;
        if (t < LAND) {
          const k = (t - SHATTER) / (LAND - SHATTER);
          const p = center.clone().lerp(landAt, k);
          g.position.set(p.x, -ground + 0.7 + Math.sin(k * Math.PI) * 4.2 - k * 0.7, p.z);
          g.rotation.y += dt * 9; // 喺半空轉圈
          if (t > LAND - 0.05 && once('land')) play('boing');
        } else if (t < CIRCLE_END) {
          // 圍住你跳 2.5 個圈，每一下跳一跳
          const k = (t - LAND) / (CIRCLE_END - LAND);
          const ang = startAng + k * Math.PI * 2 * 2.5;
          const p = K.clone().add(V(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(R));
          const hop = Math.abs(Math.sin((t - LAND) * 6.5));
          g.position.set(p.x, -ground + hop * 0.9, p.z);
          const tangent = V(Math.cos(ang), 0, -Math.sin(ang)); // 向住跳緊嘅方向
          g.rotation.y = Math.atan2(-tangent.x, -tangent.z);
          if (hop < 0.08 && once(`hop${Math.floor((t - LAND) * 6.5 / Math.PI)}`)) play('boing');
          // 你轉身跟住佢，偶然舉手歡呼
          faceTo(me.g, p.x - K.x, p.z - K.z);
          const cheer = Math.max(0, Math.sin((t - LAND) * 3));
          swing(me.arms[0], 2.9 * cheer); // 歡呼：雙手舉高
          swing(me.arms[1], 2.9 * cheer);
          me.g.position.y = Math.abs(Math.sin((t - LAND) * 3)) * 0.15;
        } else {
          // 停喺你前面（鏡頭嗰邊），開心咁細細跳
          const target = K.clone().addScaledVector(u, 1.25).addScaledVector(s, 0.7);
          const p = g.position.clone().setY(0).lerp(target, Math.min(1, dt * 4));
          const bounce = Math.abs(Math.sin((t - CIRCLE_END) * 5)) * 0.35;
          g.position.set(p.x, -ground + bounce, p.z);
          const look = K.clone().sub(p);
          g.rotation.y = Math.atan2(-look.x, -look.z) + Math.PI; // 面向你（同埋鏡頭嗰邊少少）
          faceTo(me.g, u.x, u.z); // 你轉返出嚟望住佢
          me.g.position.y = 0;
          swing(me.arms[0], 0.15);
          swing(me.arms[1], 0.15);
          moving = 0.4;
        }
        real.model.userData.animate?.(t, moving);
        // 心心
        if (t >= LAND && t >= nextHeart) {
          nextHeart = t + 0.35;
          emitHeart(g.position.clone().setY(g.position.y + fit * 0.9 + 0.3));
        }
      }
      for (const h of hearts) {
        if (h.life <= 0) continue;
        h.life -= dt;
        h.h.position.y += dt * 1.1;
        h.h.material.opacity = Math.min(1, h.life * 1.5);
        h.h.quaternion.copy(camera.quaternion);
      }
      return null;
    },
    onDone() {
      if (machine.glass) machine.glass.visible = true; // 真玻璃擺返出嚟（同新嘅一樣）
      fade.style.background = '#000';
      fade.style.opacity = 0;
      scene.remove(root); // 唔好 dispose：啲動物形狀同遊戲共用
      onDone?.();
    },
  });
}
