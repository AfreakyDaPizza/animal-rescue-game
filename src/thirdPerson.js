// 鏡頭：轆滑鼠拉近／拉遠（小朋友 2026-10-11）；拉到最近 = 第一身，其他 = 第三身見到自己個公仔
// 第三身拎住寵物：寵物頂喺頭上，用返真實大細（show 俾朋友睇！）
// 移動同互動照用原本嘅「眼」鏡頭（camera），淨係畫畫面用另一個鏡頭（view）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kgScale } from './data/animals.js';

const MIN_ZOOM = 0; // 0 = 第一身
const MAX_ZOOM = 20;
const ZOOM_STEPS = [0, 3, 5, 8, 12, 16, 20];
const HAND_SIZE = 0.4; // 第一身拎喺手嘅大細（handModel 定嘅）

function box(parent, w, h, d, color, x, y, z) {
  const mat = color.isMaterial ? color : new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Roblox 款護林員公仔：顏色由皮膚決定（mats），每款皮膚有自己嘅配件（extras）
export function buildAvatar() {
  const M = () => new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const mats = { shirt: M(), pants: M(), skin: M(), hat: M(), shoes: M() };
  const g = new THREE.Group();
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.22, 0.9, 0);
    box(hip, 0.38, 0.8, 0.38, mats.pants, 0, -0.4, 0);
    box(hip, 0.4, 0.16, 0.48, mats.shoes, 0, -0.84, -0.04);
    g.add(hip);
    return hip;
  });
  box(g, 0.85, 0.9, 0.45, mats.shirt, 0, 1.35, 0);
  const badge = box(g, 0.2, 0.35, 0.05, 0xffd600, 0.22, 1.55, -0.24); // 徽章
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group();
    sh.position.set(s * 0.62, 1.75, 0);
    box(sh, 0.34, 0.8, 0.34, mats.shirt, 0, -0.35, 0);
    box(sh, 0.32, 0.2, 0.32, mats.skin, 0, -0.82, 0);
    g.add(sh);
    return sh;
  });
  const head = new THREE.Group();
  head.position.y = 2.15;
  box(head, 0.66, 0.66, 0.66, mats.skin, 0, 0, 0);
  const hat = new THREE.Group();
  box(hat, 0.72, 0.18, 0.72, mats.hat, 0, 0.36, 0);
  box(hat, 0.9, 0.05, 0.9, mats.hat, 0, 0.28, 0);
  head.add(hat);
  for (const s of [-1, 1]) box(head, 0.1, 0.12, 0.04, 0x111111, s * 0.14, 0.04, -0.34); // 眼
  box(head, 0.18, 0.05, 0.04, 0x8d4a3a, 0, -0.14, -0.34); // 笑口
  g.add(head);

  // ---- 每款皮膚嘅配件 ----
  const extras = {};
  const make = (name, parent) => {
    const e = new THREE.Group();
    e.visible = false;
    parent.add(e);
    extras[name] = e;
    return e;
  };
  const ninja = make('ninja', head);
  box(ninja, 0.7, 0.12, 0.7, 0xd50000, 0, 0.2, 0); // 紅頭巾
  box(ninja, 0.12, 0.3, 0.06, 0xd50000, 0.12, 0.1, 0.36);
  box(ninja, 0.68, 0.3, 0.05, 0x111111, 0, -0.15, -0.34); // 面罩
  const panda = make('panda', head);
  for (const s of [-1, 1]) {
    box(panda, 0.22, 0.22, 0.12, 0x1d1d1d, s * 0.28, 0.4, 0); // 黑耳
    box(panda, 0.2, 0.22, 0.03, 0x1d1d1d, s * 0.14, 0.03, -0.335); // 黑眼圈
  }
  const astronaut = make('astronaut', head);
  const visor = box(astronaut, 0.86, 0.86, 0.86, new THREE.MeshStandardMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.5 }), 0, 0.02, 0);
  visor.castShadow = false;
  const pack = make('pack', g);
  box(pack, 0.6, 0.7, 0.3, 0xcfd8dc, 0, 1.4, 0.38); // 背囊
  const knight = make('knight', head);
  box(knight, 0.5, 0.06, 0.04, 0x111111, 0, 0.04, -0.345); // 頭盔隙
  box(knight, 0.1, 0.45, 0.4, 0xd50000, 0, 0.55, 0.05); // 紅羽毛
  const crown = make('crown', head);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd600, metalness: 0.9, roughness: 0.2, emissive: 0x6d4c00 });
  box(crown, 0.7, 0.15, 0.7, gold, 0, 0.42, 0);
  for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) box(crown, 0.12, 0.2, 0.12, gold, x, 0.58, z);
  const wings = make('wings', g);
  for (const s of [-1, 1]) {
    const w = box(wings, 0.08, 1.0, 0.6, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }), s * 0.6, 1.7, 0.4);
    w.rotation.z = s * -0.5;
  }
  return { g, legs, arms, head, mats, extras, hat, badge };
}

// 換護林員皮膚
export function applyRangerSkin(tp, skin) {
  const { mats, extras, hat, badge } = tp.avatar;
  for (const k of Object.keys(mats)) {
    mats[k].color.setHex(skin[k]);
    mats[k].metalness = skin.metal ? 0.85 : 0;
    mats[k].roughness = skin.metal ? 0.25 : 0.55;
  }
  for (const [name, e] of Object.entries(extras)) e.visible = name === skin.extra || (name === 'pack' && skin.extra === 'astronaut');
  hat.visible = !['ninja', 'panda', 'astronaut', 'knight', 'crown'].includes(skin.extra);
  badge.visible = skin.id === 'ranger';
  tp.rainbow = !!skin.rainbow;
}

export function createThirdPerson(scene, eye) {
  const avatar = buildAvatar();
  avatar.g.visible = false;
  scene.add(avatar.g);
  const view = new THREE.PerspectiveCamera(eye.fov, eye.aspect, eye.near, eye.far);
  scene.add(view);
  const headSlot = new THREE.Group(); // 寵物放喺度
  headSlot.position.y = 0.36; // 頭頂
  avatar.head.add(headSlot);
  let zoom = 5; // 一開始第三身
  try {
    const saved = localStorage.getItem('animal-rescue-zoom');
    if (saved !== null) zoom = Number(saved);
  } catch {
    // 記唔到就用預設
  }
  return { avatar, view, headSlot, eye, held: null, phase: 0, zoom, smoothZoom: zoom };
}

// 轆滑鼠：dir = 1 拉遠、-1 拉近
export function zoomCamera(tp, dir) {
  let i = ZOOM_STEPS.findIndex((z) => z >= tp.zoom - 0.01);
  if (i < 0) i = ZOOM_STEPS.length - 1;
  i = Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir));
  tp.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ZOOM_STEPS[i]));
  try {
    localStorage.setItem('animal-rescue-zoom', tp.zoom);
  } catch {
    // 記唔到就算
  }
}

// 放返去手（第一身）
function toHand(tp, held) {
  tp.eye.add(held);
  held.position.set(0.5, -0.5, -0.95);
  held.scale.setScalar(1);
  held.userData.inner.rotation.y = Math.PI * 0.8;
}

const fwd = new THREE.Vector3();

// held：手上嘅模型；item：嗰隻動物嘅資料（用嚟計真實大細）；回傳要用嚟畫畫面嘅鏡頭
export function updateThirdPerson(tp, dt, { held, item, walking, feetY, station = null }) {
  const { eye, avatar, view } = tp;
  tp.smoothZoom += (tp.zoom - tp.smoothZoom) * Math.min(1, dt * 10);
  const third = tp.zoom > 0;

  // 寵物：第三身頂喺頭上（向前、真實大細）；第一身拎喺手
  if (tp.held && tp.held !== held && tp.held.parent === tp.headSlot) tp.held.removeFromParent();
  tp.held = held;
  let petSize = 0;
  if (held) {
    if (third) {
      if (held.parent !== tp.headSlot) tp.headSlot.add(held);
      const giant = item?.sizeMul || 1;
      const real = (held.userData.realMax || 1) * (item ? kgScale(item) : 1) * giant;
      petSize = Math.min(real, giant > 1 ? 25 : 8); // 巨型最大 25 米，普通最大 8 米
      held.scale.setScalar(petSize / HAND_SIZE);
      held.userData.inner.rotation.y = 0; // 向前（之前係打側）
      held.position.set(0, Math.abs(Math.sin(tp.phase)) * 0.08, 0);
      held.rotation.set(0, 0, 0);
    } else if (held.parent !== eye) toHand(tp, held);
  }

  avatar.g.visible = third;
  if (!third) return eye;

  // 公仔跟住玩家（腳嘅位置、面向）
  avatar.g.position.set(eye.position.x, feetY, eye.position.z);
  avatar.g.rotation.y = eye.rotation.y;
  avatar.g.rotation.x = 0;
  avatar.head.position.y = 2.15;
  const running = station?.kind === 'treadmill'; // 跑步機：自動跑
  const sitting = station?.kind === 'table'; // 學生桌：坐低寫字
  tp.phase += dt * (running ? 16 : walking ? 10 : 0);
  if (tp.rainbow) {
    const h = (performance.now() / 4000) % 1;
    avatar.mats.shirt.color.setHSL(h, 1, 0.5);
    avatar.mats.pants.color.setHSL((h + 0.33) % 1, 1, 0.5);
    avatar.mats.shoes.color.setHSL((h + 0.66) % 1, 1, 0.5);
  }
  const swing = running ? Math.sin(tp.phase) * 1.1 : walking ? Math.sin(tp.phase) * 0.7 : 0;
  if (sitting) {
    // 坐喺張櫈面上、面向書枱：大髀向前打橫，雙手向前放喺枱面，右手寫字，個頭望落本書
    tp.phase2 = (tp.phase2 || 0) + dt * 8;
    avatar.g.position.set(station.x, -0.08, station.z + 1.3); // 櫈面高 0.62，屁股啱啱坐喺上面
    avatar.g.rotation.y = 0;
    avatar.legs.forEach((l) => (l.rotation.x = Math.PI / 2)); // 正數 = 向前
    avatar.arms[0].rotation.x = 1.15; // 左手撳住本書
    avatar.arms[0].rotation.z = 0;
    avatar.arms[1].rotation.x = 1.15 + Math.sin(tp.phase2) * 0.08; // 右手寫字
    avatar.arms[1].rotation.z = Math.sin(tp.phase2 * 1.7) * 0.1;
    avatar.head.rotation.x = 0.25 + Math.sin(tp.phase2 * 0.3) * 0.05; // 望落枱面
  } else {
    if (running) {
      avatar.g.rotation.y = 0; // 向住跑步機前面
      avatar.g.rotation.x = -0.12; // 跑步向前傾
      avatar.g.position.y = feetY + Math.abs(Math.sin(tp.phase)) * 0.12;
    }
    avatar.head.rotation.x = 0;
    avatar.arms.forEach((a) => (a.rotation.z = 0));
    avatar.legs[0].rotation.x = swing;
    avatar.legs[1].rotation.x = -swing;
    if (held) avatar.arms.forEach((a) => (a.rotation.x = Math.PI)); // 雙手舉高托住寵物
    else {
      avatar.arms[0].rotation.x = -swing;
      avatar.arms[1].rotation.x = swing;
    }
  }

  // 鏡頭：喺公仔後面；寵物越大，退得越後，等你睇得晒
  eye.getWorldDirection(fwd);
  const dist = tp.smoothZoom + petSize * 0.9;
  view.quaternion.copy(eye.quaternion);
  view.position.copy(eye.position).addScaledVector(fwd, -dist);
  view.position.y += 0.6 + petSize * 0.35;
  view.position.y = Math.max(view.position.y, feetY + 0.5);
  view.aspect = eye.aspect;
  view.updateProjectionMatrix();
  return view;
}
