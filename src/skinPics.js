// 皮膚商店嘅公仔相（小朋友 Issue #14）：用真嘅 3D 公仔著住嗰款皮膚影一張相（唔再係一格色）
// 同 animalPics.js 一樣：一個細細嘅離屏 renderer，每格畫面最多影幾張，影過就記住；未影好先顯示色塊

import * as THREE from 'three';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';

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
        url = shoot(id);
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
