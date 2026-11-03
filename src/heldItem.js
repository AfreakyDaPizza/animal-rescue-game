// ✋ 單手拎嘢（小朋友 2026-11-03：「拎住 Shard 嗰啲要用一隻手，而且要喺隻手度」）
// Shard、寶箱、其他 Gear、鎚仔：
//   第三身：淨係右手舉起拎住（左手照擺），件嘢掛喺右手手掌，跟住手臂郁
//   第一身：畫面右下角有一隻手（衫袖 + 手掌），件嘢喺手掌上面
// 用法（main.js）：
//   const hold = createHandHold({ camera, avatar: thirdPerson.avatar });
//   hold.tpHand.add(鎚仔)；hold.fpHand.add(鎚仔)   ← 原點 = 手掌中間，Group 永遠企直（唔跟手臂斜）
//   每格：hold.setGear(gear 種類或 null)；hold.update({ time, third, show, walking })   ← 要喺 updateThirdPerson 之後
//   updateThirdPerson(..., { oneHand: hold.active })：右手擺做拎嘢姿勢（thirdPerson.js 嘅 poseOneHand）
// 抱住動物（雙手頂喺頭上）唔關呢度事，照舊。
import * as THREE from 'three';
import { shardModel } from './gearArt.js';
import { gearInfo, isChestGear } from './data/gears.js';

// 第三身：手掌喺右手臂（膊頭原點）入面嘅位置（thirdPerson.js：手掌方塊中心 y = -0.81）
const TP_PALM_Y = -0.81;
// Gear 喺手掌上面幾高（世界向上；手臂斜咗，手掌頂大約高 0.2）
const TP_ITEM = { y: 0.24, scale: 0.5 };
const FP_ITEM = { y: 0.05, scale: 0.12 };
const FP_ARM = { x: 0.42, y: -0.38, z: -0.5 }; // 第一身隻手喺鏡頭嘅邊度（右下角，避開中間嘅提示字）

// 🧰 寶箱：細細個木箱 + 寶箱顏色嘅邊 + 金鎖（每種顏色一個）
const chestCache = new Map();
function chestModel(type, slot) {
  const key = `${type}|${slot}`;
  if (chestCache.has(key)) return chestCache.get(key);
  const color = gearInfo(type).color;
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd600, emissive: 0xffab00, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.25 });
  const add = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  add(0.9, 0.5, 0.6, wood, 0, -0.15, 0); // 箱身
  add(0.94, 0.28, 0.64, trim, 0, 0.24, 0); // 蓋
  for (const x of [-0.36, 0.36]) add(0.1, 0.8, 0.66, trim, x, 0, 0); // 兩條邊
  add(0.16, 0.2, 0.08, gold, 0, 0.08, -0.33); // 鎖
  g.userData.baseY = 0.1;
  g.userData.animate = (t) => {
    g.position.y = g.userData.baseY + Math.sin(t * 2.4) * 0.04;
  };
  chestCache.set(key, g);
  return g;
}

// 手上嘅 Gear 模型：Shard 用 gearArt.js，寶箱用上面個木箱；冇樣就 null
function gearModel(type, slot) {
  if (isChestGear(type)) return chestModel(type, slot);
  return shardModel(type, slot);
}

const box = (parent, w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};

export function createHandHold({ camera, avatar }) {
  // ---- 第三身：右手手掌 ----
  const tpHand = new THREE.Group();
  tpHand.rotation.order = 'ZYX'; // 同手臂（XYZ）倒轉次序 → 抵銷手臂嘅轉動，件嘢企直
  tpHand.position.set(0, TP_PALM_Y, 0);
  avatar.arms[1].add(tpHand);
  const tpGear = new THREE.Group();
  tpGear.position.y = TP_ITEM.y;
  tpGear.scale.setScalar(TP_ITEM.scale);
  tpHand.add(tpGear);

  // ---- 第一身：畫面右下角一隻手（用公仔嘅衫袖／皮膚物料，換皮膚都跟） ----
  const fpArm = new THREE.Group();
  fpArm.position.set(FP_ARM.x, FP_ARM.y, FP_ARM.z);
  fpArm.rotation.set(0.3, 0.2, 0.08); // 手臂向前、少少向上、少少向中間
  fpArm.visible = false;
  camera.add(fpArm);
  box(fpArm, 0.09, 0.09, 0.5, avatar.mats.sleeve, 0, 0, 0.12); // 衫袖（後面伸出畫面外）
  box(fpArm, 0.095, 0.085, 0.1, avatar.mats.skin, 0, 0, -0.18); // 手掌
  const fpHand = new THREE.Group();
  fpHand.rotation.order = 'ZYX';
  fpHand.rotation.set(-0.3, -0.2, -0.08); // 抵銷手臂斜度 → 件嘢企直
  fpHand.position.set(0, 0, -0.18);
  fpArm.add(fpHand);
  const fpGear = new THREE.Group();
  fpGear.position.y = FP_ITEM.y;
  fpGear.scale.setScalar(FP_ITEM.scale);
  fpHand.add(fpGear);

  let gear = null; // 而家手上邊種 Gear
  const hold = {
    tpHand,
    fpHand,
    fpArm,
    get gear() {
      return gear;
    },
    // 有冇嘢拎喺手（Gear 有模型，或者 main.js 話鎚仔出咗嚟）
    tool: false,
    get active() {
      return !!(tpGear.children.length || hold.tool);
    },
    setGear(type) {
      if (type === gear) return;
      gear = type;
      for (const [holder, slot] of [[fpGear, 'hand'], [tpGear, 'avatar']]) {
        holder.clear();
        const m = type && gearModel(type, slot);
        if (m) holder.add(m);
      }
    },
    // third：第三身？ show：可以拎（冇抱住動物等）；walking：行緊路（第一身手輕輕擺）
    update({ time, third, show = true, walking = false }) {
      const has = show && hold.active;
      tpHand.visible = third && has;
      fpArm.visible = !third && has;
      tpGear.visible = fpGear.visible = show;
      if (!has) return;
      // 第三身：抵銷右手臂嘅轉動（件嘢企直）
      const r = avatar.arms[1].rotation;
      tpHand.rotation.set(-r.x, -r.y, -r.z);
      // 第一身：企定輕輕上下，行路擺多少少
      const k = walking ? 1 : 0.35;
      fpArm.position.set(FP_ARM.x + Math.sin(time * 4.5) * 0.008 * k, FP_ARM.y + Math.abs(Math.cos(time * 4.5)) * 0.012 * k + Math.sin(time * 1.6) * 0.004, FP_ARM.z);
      for (const h of [tpGear, fpGear]) h.children[0]?.userData.animate?.(time);
    },
  };
  return hold;
}
