// 皮膚商店嘅公仔相（小朋友 Issue #14）：用真嘅 3D 公仔著住嗰款皮膚影一張相（唔再係一格色）
// 同 animalPics.js 一樣：一個細細嘅離屏 renderer，每格畫面最多影幾張，影過就記住；未影好先顯示色塊

import * as THREE from 'three';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS, PET_SKINS, applyPetSkin, animateSkins } from './skins.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';

const W = 180;
const H = 210;
const PER_FRAME_MS = 14;
const cache = new Map(); // skin id → data URL
const queue = [];
let renderer = null;
let scene = null;
let camera = null;
let running = false;
let idleTimer = null;

const hex = (n) => `#${(n ?? 0x888888).toString(16).padStart(6, '0')}`;

// 一款皮膚個相嘅 HTML（未影好：用皮膚顏色做底，影好自動換）
export function rangerSkinPic(skin) {
  const url = cache.get(skin.id);
  if (!url && !queue.includes(skin.id)) {
    queue.push(skin.id);
    schedule();
  }
  const bg = `linear-gradient(160deg, ${hex(skin.hat)}55, ${hex(skin.shirt)}88 60%, ${hex(skin.pants)}aa)`;
  return `<div class="skin-pic" data-skin-pic="${skin.id}" style="--skin-bg:${bg}">${url ? `<img src="${url}" alt="">` : ''}</div>`;
}

// 🐾 寵物皮膚個相（2026-11-03 小朋友：寵物皮膚都要睇到）：一隻熊貓著住嗰款皮膚；swatch = 未影好時嘅底色
const PET_PIC_ANIMAL = 'Giant Panda';
const PET_PIC_TURN = -0.55; // 少少側身，望到塊面
export function petSkinPic(skin, swatch = ['#cfd8dc', '#90a4ae']) {
  const key = `pet:${skin.id}`;
  const url = cache.get(key);
  if (!url && !queue.includes(key)) {
    queue.push(key);
    schedule();
  }
  const bg = `linear-gradient(160deg, ${swatch.map((c) => `${c}aa`).join(', ')})`;
  return `<div class="skin-pic" data-skin-pic="${key}" style="--skin-bg:${bg}">${url ? `<img src="${url}" alt="">` : ''}</div>`;
}

function shootPet(id) {
  const model = buildAnimalModel(findAnimal(PET_PIC_ANIMAL));
  // 先量大細同擺正（未加皮膚特效，唔係粒子會令個框好大）
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = 2.3 / Math.max(size.x, size.y, size.z);
  model.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(model);
  const mid = box2.getCenter(new THREE.Vector3());
  model.position.x -= mid.x;
  model.position.z -= mid.z;
  model.position.y -= box2.min.y;
  const holder = new THREE.Group();
  holder.add(model);
  holder.rotation.y = PET_PIC_TURN;
  applyPetSkin(model, id);
  animateSkins(1.3);
  scene.add(holder);
  camera.position.set(0, 2.2, -7.2);
  camera.lookAt(0, 1.0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(holder);
  return url;
}

function setup() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W * 2, H * 2, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, -5);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbbddff, 1.0);
  rim.position.set(-4, 3, 5);
  scene.add(rim);
  camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
}

function shoot(id) {
  const skin = RANGER_SKINS.find((s) => s.id === id);
  const av = buildAvatar();
  applyRangerSkin({ avatar: av }, skin);
  av.outfit?.animate(1.3, null, 3);
  // 擺個型：少少轉身、隻手少少擺開
  av.g.rotation.y = -0.45;
  av.arms[0].rotation.z = -0.12;
  av.arms[1].rotation.z = 0.12;
  av.arms[1].rotation.x = 0.15;
  scene.add(av.g);
  camera.position.set(-2.6, 2.2, -6.4);
  camera.lookAt(0, 1.45, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(av.g);
  return url;
}

function schedule() {
  if (running) return;
  running = true;
  requestAnimationFrame(step);
}

function step() {
  const start = performance.now();
  if (queue.length) setup();
  while (queue.length && performance.now() - start < PER_FRAME_MS) {
    const id = queue.shift();
    let url = cache.get(id);
    if (!url) {
      try {
        url = id.startsWith('pet:') ? shootPet(id.slice(4)) : shoot(id);
      } catch (e) {
        console.warn('Could not draw skin', id, e);
        continue;
      }
      cache.set(id, url);
    }
    for (const el of document.querySelectorAll(`[data-skin-pic="${id}"]`)) el.innerHTML = `<img src="${url}" alt="">`;
  }
  if (queue.length) return requestAnimationFrame(step);
  running = false;
  // 影完一陣冇嘢做：收返個 WebGL（慳記憶體）
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (running || !renderer) return;
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }, 4000);
}
