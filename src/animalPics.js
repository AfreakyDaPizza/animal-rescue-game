// Index／寵物清單用嘅動物相（小朋友 2026-10-18：「Index 入面要見到動物嘅相」）
// 同跑步機嗰啲縮圖一樣：用一個細細嘅離屏 renderer 影低 3D 模型 → data URL
// 慢慢影（每格畫面最多影幾張），唔會卡住個遊戲；影過就記住（記憶體 + sessionStorage）
// 未救過嘅動物：影黑色剪影（唔會講個名）

import * as THREE from 'three';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';
import { rarityInfo } from './data/balance.js';

const W = 160;
const H = 130;
const PER_FRAME_MS = 12; // 每格畫面最多用幾耐嚟影相
const CACHE_KEY = 'animal-rescue-pics-v1';

const cache = new Map(); // key → data URL
const queue = []; // 等緊影嘅 key
const queued = new Set();
const keyInfo = new Map(); // key → { name, silhouette }
let ids = 0;
const idOf = new Map(); // 'name|s' → 短 id（唔將動物名放入 HTML，免得剪影露底）

try {
  const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
  for (const [k, v] of Object.entries(saved)) cache.set(k, v);
} catch {}
function persist() {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {} // 太大／私隱模式：唔緊要，淨係記喺記憶體
}

// 一隻動物個相嘅 HTML。未影好就先顯示 emoji（或者 ❓），影好自動換
export function petPic(name, { silhouette = false, rarity = null } = {}) {
  const animal = findAnimal(name);
  if (!animal) return '<div class="emoji">❓</div>';
  const raw = `${animal.name}|${silhouette ? 's' : ''}`;
  if (!idOf.has(raw)) {
    const id = `p${ids++}`;
    idOf.set(raw, id);
    keyInfo.set(id, { name: animal.name, silhouette });
  }
  const id = idOf.get(raw);
  const cacheKey = raw;
  const color = silhouette ? '#cfd8dc' : rarityInfo(rarity || animal.rarity || 'Common').color;
  const url = cache.get(cacheKey);
  if (!url && !queued.has(id)) {
    queued.add(id);
    queue.push(id);
    schedule();
  }
  const inner = url ? `<img src="${url}" alt="">` : `<span class="emoji">${silhouette ? '❓' : animal.emoji}</span>`;
  return `<div class="pet-pic${silhouette ? ' silhouette' : ''}" data-pic="${id}" style="--pic-bg:${color}">${inner}${silhouette && url ? '<span class="q">?</span>' : ''}</div>`;
}

// ---------- 影相 ----------
let renderer = null;
let scene = null;
let camera = null;
let idleTimer = null;
let running = false;
const black = new THREE.MeshBasicMaterial({ color: 0x1b2430 });

function setup() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W * 2, H * 2, false); // 影大啲再縮細，清楚啲
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, -4); // 由前面照（動物望住 -z）
  scene.add(sun);
  const back = new THREE.DirectionalLight(0xffffff, 0.6);
  back.position.set(-3, 2, 4);
  scene.add(back);
  camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 2000);
}

function shoot(id) {
  const info = keyInfo.get(id);
  const animal = findAnimal(info.name);
  const model = buildAnimalModel(animal);
  model.userData.animate?.(0.4, 0); // 擺好姿勢（有啲模型喺 animate 先擺腳）
  if (info.silhouette) {
    model.traverse((o) => {
      if (o.isPoints || o.isSprite || o.isLine) o.visible = false;
      else if (o.isMesh) o.material = black;
    });
  }
  scene.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  camera.position.copy(c).add(new THREE.Vector3(0.9, 0.5, -1).normalize().multiplyScalar(size * 1.15));
  camera.near = size / 100;
  camera.far = size * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(c);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(model); // 唔好 dispose geometry：modelKit 有啲係共用嘅
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
    queued.delete(id);
    const info = keyInfo.get(id);
    const cacheKey = `${info.name}|${info.silhouette ? 's' : ''}`;
    let url = cache.get(cacheKey);
    if (!url) {
      try {
        url = shoot(id);
      } catch (e) {
        console.warn('Could not draw', info.name, e);
        continue;
      }
      cache.set(cacheKey, url);
    }
    // 換晒畫面上等緊呢張相嘅格
    for (const el of document.querySelectorAll(`[data-pic="${id}"]`)) {
      el.innerHTML = `<img src="${url}" alt="">${info.silhouette ? '<span class="q">?</span>' : ''}`;
    }
  }
  if (queue.length) return requestAnimationFrame(step);
  running = false;
  persist();
  // 影完一陣冇嘢做：收返個 WebGL（慳記憶體，手機尤其重要）
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (running || !renderer) return;
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }, 4000);
}
