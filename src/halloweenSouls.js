// 👻 Halloween 6 種靈魂（小朋友 Issue #6 設計圖：scratchpad/hw_souls.png）— 用 Ghost Vacuum 吸
// buildSoul(id) → group；每格叫 group.userData.update(t)
//   group.userData.suck(p, nozzle)  p 0→1：俾吸塵機吸緊（定住、向住吸塵機嘴拉長、震、縮細、變光），1 = 吸晒
//   group.userData.pull(k, nozzle)  k 0→1：捉到之後「咻」一聲飛入吸塵機嘴
//   group.userData.charge(k) k 0→1：準備攻擊（發光變大，提你要閃）
// launchSoulOrb(scene, from, to, color) → 一粒慢慢飛向「發射嗰陣」目標位置嘅光球（好易閃），每格 orb.update(dt) 回傳 'flying' | 'done'
// 數值（掉幾多 Soul Dust、要吸幾耐、幾常見、幾耐攻擊一次）喺 balance.js HALLOWEEN_SOULS
import * as THREE from 'three';
import { M, G, ADD, GHOST, bx, sph, cone, cyl, piv, chain, flame, between } from './halloweenKit.js';
import { HALLOWEEN_SOULS, HALLOWEEN_SOUL_ORB_SPEED, HALLOWEEN_SOUL_ORB_WARNING } from './data/balance.js';

const PI = Math.PI;

// 每種靈魂嘅資料 + 攻擊光球顏色
const COLORS = { small: 0x84ffff, wandering: 0xe3f2fd, phantom: 0x448aff, wraith: 0x69f0ae, ghoul: 0xff9100, poltergeist: 0xd500f9 };
export const SOUL_TYPES = HALLOWEEN_SOULS.map((s) => ({ ...s, color: COLORS[s.id] }));
export const soulType = (id) => SOUL_TYPES.find((s) => s.id === id);
// 隨機揀一種（跟 weight）
export function randomSoulType(rand = Math.random) {
  const total = SOUL_TYPES.reduce((n, s) => n + s.weight, 0);
  let r = rand() * total;
  return SOUL_TYPES.find((s) => (r -= s.weight) < 0) || SOUL_TYPES[0];
}
// 掉幾多 Soul Dust
export const rollSoulDust = (type, rand = Math.random) => Math.round(type.dust[0] + (type.dust[1] - type.dust[0]) * rand());

// ---------- 1. Small Soul：發光青色波波 + 柔光 ----------
function small(body) {
  const core = sph(body, 0.2, 0.2, 0.2, G(0x4dd0e1, 1.3), 0, 0, 0);
  const halo = sph(body, 0.38, 0.38, 0.38, ADD(0x00e5ff, 0.22), 0, 0, 0);
  const halo2 = sph(body, 0.55, 0.55, 0.55, ADD(0x00b8d4, 0.1), 0, 0, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.015, 4, 24), ADD(0x84ffff, 0.7));
  body.add(ring);
  const dots = [0, 1, 2].map(() => sph(body, 0.04, 0.04, 0.04, ADD(0xffffff, 0.9), 0, 0, 0, true));
  return { height: 0.9, glow: [core.material], update(t) {
    halo.scale.setScalar(0.38 * (1 + Math.sin(t * 3) * 0.1));
    halo2.scale.setScalar(0.55 * (1 + Math.sin(t * 2) * 0.08));
    ring.rotation.set(PI / 2 + Math.sin(t) * 0.4, t, 0);
    dots.forEach((d, i) => {
      const a = t * 2 + (i / 3) * PI * 2;
      d.position.set(Math.cos(a) * 0.45, Math.sin(t * 3 + i) * 0.15, Math.sin(a) * 0.45);
    });
  } };
}

// ---------- 2. Wandering Soul：白色飄飄嘅幽靈，好多條尾巴 ----------
function wandering(body) {
  const mist = ADD(0xcfd8dc, 0.2);
  const head = sph(body, 0.26, 0.3, 0.24, ADD(0xe3f2fd, 0.35), 0, 0.75, 0);
  sph(body, 0.16, 0.2, 0.15, ADD(0xffffff, 0.5), 0, 0.78, 0);
  const eyes = M(0x37474f);
  for (const s of [-1, 1]) sph(body, 0.04, 0.06, 0.02, eyes, s * 0.09, 0.8, -0.22);
  // 尾巴：好多條長長嘅白色飄帶（一串串越嚟越細嘅波波），向後向下飄
  const tails = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * PI * 2;
    const p = piv(body, Math.cos(a) * 0.14, 0.6, Math.sin(a) * 0.14);
    const beads = [];
    for (let i = 0; i < 9; i++) beads.push(sph(p, 0.09 - i * 0.008, 0.13, 0.09 - i * 0.008, mist, 0, -i * 0.13, 0, true));
    tails.push({ p, beads, a, seed: k * 1.7 });
  }
  return { height: 1.5, glow: [], update(t) {
    head.scale.set(0.26, 0.3 * (1 + Math.sin(t * 2) * 0.05), 0.24);
    for (const tl of tails) tl.beads.forEach((b, i) => {
      b.position.x = Math.sin(t * 2.2 + tl.seed - i * 0.5) * 0.035 * i + Math.cos(tl.a) * i * 0.035;
      b.position.z = Math.cos(t * 1.8 + tl.seed - i * 0.5) * 0.035 * i + Math.sin(tl.a) * i * 0.03 + i * 0.07;
    });
  } };
}

// ---------- 3. Phantom Spirit：藍色旋轉火焰 + 好光嘅核 ----------
function phantom(body) {
  const core = sph(body, 0.16, 0.16, 0.16, G(0x90caf9, 1.4), 0, 0.5, 0);
  const coreHalo = sph(body, 0.28, 0.28, 0.28, ADD(0x448aff, 0.35), 0, 0.5, 0);
  const swirls = [];
  for (let i = 0; i < 6; i++) {
    const p = piv(body, 0, 0, 0);
    const m = cone(p, 0.24 - i * 0.02, 1.25 - i * 0.1, ADD(i % 2 ? 0x1a3fd6 : 0x2979ff, 0.26), 0.2, 0.6, 0, 0, -0.4, 7);
    m.castShadow = false;
    p.rotation.y = (i / 6) * PI * 2;
    swirls.push(p);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 4, 20), ADD(0x2979ff, 0.45));
  ring.position.y = 0.2;
  ring.rotation.x = PI / 2;
  body.add(ring);
  return { height: 1.6, glow: [core.material], update(t) {
    swirls.forEach((p, i) => {
      p.rotation.y = t * (1.5 + i * 0.15) + (i / 6) * PI * 2;
      p.scale.y = 1 + Math.sin(t * 6 + i) * 0.12;
    });
    coreHalo.scale.setScalar(0.28 * (1 + Math.sin(t * 5) * 0.15));
    ring.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
  } };
}

// ---------- 4. Wraith Soul：細隻綠色死神 + 鐮刀 ----------
function wraith(body) {
  const robe = GHOST(0x1b5e20, 0.92, 0.35);
  const dark = GHOST(0x0b2e10, 0.92, 0.2);
  const cloak = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.48, 1.0, 9, 1, true), robe);
  cloak.position.y = 0.55;
  body.add(cloak);
  const tatters = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const p = piv(body, Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45);
    p.rotation.y = -a;
    bx(p, 0.18, 0.3, 0.03, i % 2 ? robe : dark, 0, -0.15, 0, 0.3).castShadow = false;
    tatters.push(p);
  }
  sph(body, 0.26, 0.28, 0.26, robe, 0, 1.15, 0.02);
  cone(body, 0.2, 0.3, robe, 0, 1.4, 0.1, -0.5, 0, 7);
  const hole = sph(body, 0.17, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0x020604 }), 0, 1.12, -0.22);
  hole.castShadow = false;
  const eye = G(0x76ff03, 3);
  for (const s of [-1, 1]) sph(body, 0.035, 0.022, 0.02, eye, s * 0.06, 1.14, -0.26).castShadow = false;
  // 手 + 綠色細鐮刀
  const arm = piv(body, 0.28, 0.95, 0);
  arm.rotation.x = -0.3;
  bx(arm, 0.14, 0.45, 0.14, robe, 0, -0.2, 0, 0.3);
  const blade = G(0x00e676, 2.2);
  between(arm, new THREE.Vector3(0, -0.6, 0.35), new THREE.Vector3(0, 0.5, -0.25), 0.02, M(0x263238));
  const pts = [0, 1, 2, 3, 4, 5].map((i) => new THREE.Vector3(0, 0.5 - (i / 5) ** 2 * 0.3, -0.25 - (i / 5) * 0.55));
  for (let i = 0; i < 5; i++) between(arm, pts[i], pts[i + 1], 0.05 - i * 0.008, blade, 0.045 - i * 0.008).castShadow = false;
  const aura = sph(body, 0.55, 0.2, 0.55, ADD(0x69f0ae, 0.35), 0, 0.05, 0, true);
  return { height: 1.6, glow: [eye, blade], update(t) {
    tatters.forEach((p, i) => (p.rotation.x = Math.sin(t * 4 + i) * 0.4));
    arm.rotation.x = -0.3 + Math.sin(t * 1.5) * 0.15;
    aura.scale.set(0.55 + Math.sin(t * 2) * 0.05, 0.2, 0.55 + Math.cos(t * 2) * 0.05);
  } };
}

// ---------- 5. Ghoul：火焰人，手揸火球 ----------
function ghoul(body) {
  const fire = new THREE.MeshStandardMaterial({ color: 0xbf360c, emissive: 0xff6d00, emissiveIntensity: 0.9, roughness: 0.6 });
  const ember = G(0xffab00, 1.8);
  const crackM = G(0xffd54f, 2.2);
  const legs = [-1, 1].map((s) => {
    const p = piv(body, s * 0.16, 0.7, 0);
    bx(p, 0.2, 0.7, 0.22, fire, 0, -0.33, 0, 0.3);
    return p;
  });
  bx(body, 0.6, 0.65, 0.34, fire, 0, 1.05, 0, 0.3);
  for (const [x, y, rz] of [[-0.12, 1.1, 0.5], [0.1, 0.95, -0.4], [0.05, 1.25, 0.2], [-0.18, 0.9, -0.7], [0.18, 1.2, 0.8]]) {
    const c = bx(body, 0.03, 0.22, 0.03, crackM, x, y, -0.17, 0.3);
    c.rotation.z = rz;
  }
  const head = piv(body, 0, 1.52, 0);
  bx(head, 0.36, 0.36, 0.34, fire, 0, 0, 0, 0.3);
  for (const s of [-1, 1]) {
    const e = bx(head, 0.1, 0.05, 0.03, G(0xffff8d, 3.5), s * 0.09, 0.03, -0.17, 0.3);
    e.rotation.z = s * -0.3; // 怒目
    e.castShadow = false;
  }
  bx(head, 0.16, 0.04, 0.03, G(0xffff8d, 3), 0, -0.09, -0.17, 0.3).castShadow = false;
  const flames = [flame(head, 0, 0.12, 0, 0.6), flame(head, -0.12, 0.1, 0.05, 0.4), flame(head, 0.12, 0.1, 0.05, 0.42), flame(body, -0.32, 1.3, 0, 0.35), flame(body, 0.32, 1.3, 0, 0.35)];
  const arms = [-1, 1].map((s) => {
    const p = piv(body, s * 0.4, 1.3, 0);
    bx(p, 0.17, 0.6, 0.17, fire, 0, -0.27, 0, 0.3);
    return p;
  });
  arms[1].rotation.x = -0.9; // 右手向前托住火球
  const ball = piv(arms[1], 0, -0.7, 0);
  const fb = sph(ball, 0.16, 0.16, 0.16, ember, 0, 0, 0);
  const fbHalo = sph(ball, 0.28, 0.28, 0.28, ADD(0xff6d00, 0.5), 0, 0, 0, true);
  fb.castShadow = fbHalo.castShadow = false;
  const ballFlame = flame(ball, 0, 0.05, 0, 0.5);
  return { height: 2.0, glow: [fire, ember], legs, update(t) {
    flames.forEach((f) => f.userData.flicker(t));
    ballFlame.userData.flicker(t);
    fire.emissiveIntensity = 0.85 + Math.sin(t * 8) * 0.15;
    fbHalo.scale.setScalar(0.28 * (1 + Math.sin(t * 7) * 0.15));
    arms[0].rotation.x = Math.sin(t * 2) * 0.2;
    legs[0].rotation.x = Math.sin(t * 2) * 0.15;
    legs[1].rotation.x = -Math.sin(t * 2) * 0.15;
  } };
}

// ---------- 6. Poltergeist Ghoul：紫色漩渦 + 鐵鏈 + 飛來飛去嘅瓶同書 ----------
function poltergeist(body) {
  const layers = [];
  for (let i = 0; i < 7; i++) {
    const r = 0.22 + i * 0.11;
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05 + i * 0.01, 5, 18, PI * 1.6), i % 2 ? GHOST(0x311b92, 0.8, 0.4) : ADD(0x9c27b0, 0.4));
    m.position.y = 0.25 + i * 0.28;
    m.rotation.x = PI / 2;
    body.add(m);
    layers.push(m);
  }
  const core = sph(body, 0.2, 0.26, 0.2, G(0xea80fc, 1.6), 0, 1.4, 0);
  const coreHalo = sph(body, 0.4, 0.5, 0.4, ADD(0xd500f9, 0.3), 0, 1.4, 0);
  core.castShadow = coreHalo.castShadow = false;
  const eye = G(0xffffff, 3);
  for (const s of [-1, 1]) {
    const e = bx(body, 0.1, 0.04, 0.03, eye, s * 0.1, 1.55, -0.24, 0.3);
    e.rotation.z = s * -0.35;
    e.castShadow = false;
  }
  // 鐵鏈：由漩渦甩出去
  const iron = M(0x455a64, { metalness: 0.7, roughness: 0.4 });
  const chains = [0, 1, 2, 3].map((i) => {
    const p = piv(body, 0, 1.2, 0);
    p.rotation.y = (i / 4) * PI * 2 + 0.4;
    chain(p, new THREE.Vector3(0.4, 0, 0), new THREE.Vector3(1.25, -0.5 + (i % 2) * 0.7, 0), 9, iron);
    bx(p, 0.14, 0.18, 0.14, iron, 1.3, -0.55 + (i % 2) * 0.7, 0, 0.2); // 鏈尾鐵塊
    return p;
  });
  // 飛嘅瓶同書
  const jarM = M(0x5d6d7e, { roughness: 0.4 });
  const bookM = [M(0x4e342e), M(0x311b92), M(0x1b5e20)];
  const items = [];
  for (let i = 0; i < 6; i++) {
    const p = piv(body, 0, 0, 0);
    const it = i % 2 ? cyl(p, 0.1, 0.24, jarM, 0, 0, 0, 0, 0, 0.07) : bx(p, 0.26, 0.06, 0.2, bookM[(i / 2) | 0], 0, 0, 0, 0.15);
    it.position.x = 1.1 + (i % 3) * 0.2;
    items.push({ p, it, h: 0.7 + (i % 3) * 0.55, s: 0.7 + (i % 4) * 0.2, o: (i / 6) * PI * 2 });
  }
  return { height: 2.4, glow: [core.material, eye], update(t) {
    layers.forEach((m, i) => {
      m.rotation.z = t * (2 + i * 0.4) * (i % 2 ? -1 : 1);
      m.position.x = Math.sin(t * 2 + i) * 0.05 * i;
    });
    coreHalo.scale.set(0.4 * (1 + Math.sin(t * 4) * 0.1), 0.5, 0.4);
    chains.forEach((p, i) => (p.rotation.y = t * 0.8 + (i / 4) * PI * 2));
    items.forEach(({ p, it, h, s, o }) => {
      p.rotation.y = t * s + o;
      p.position.y = h + Math.sin(t * 2 + o) * 0.15;
      it.rotation.set(t * 1.3 + o, t, 0);
    });
  } };
}

const BUILDERS = { small, wandering, phantom, wraith, ghoul, poltergeist };

const tmpV = new THREE.Vector3();
export function buildSoul(id) {
  const type = soulType(id) || SOUL_TYPES[0];
  const g = new THREE.Group();
  // aim：喺隻鬼個身中間，俾吸緊嗰陣 +z 指住吸塵機嘴，沿住 z 拉長（好似俾人吸住）
  const aim = piv(g, 0, 0, 0);
  const body = piv(aim, 0, 0, 0); // 縮細／轉圈都喺 body 度做，唔影響 g 嘅位置
  const spec = BUILDERS[type.id](body);
  const mid = 0.7 + spec.height * 0.45;
  aim.position.y = mid;
  const telegraph = sph(g, 0.5, 0.5, 0.5, ADD(type.color, 0.0), 0, mid, 0, true); // 攻擊前會亮
  telegraph.castShadow = false;
  const suckGlow = sph(aim, 0.7, 0.7, 0.7, ADD(type.color, 0), 0, 0, 0, true); // 俾吸緊：成隻發光
  suckGlow.castShadow = false;
  const baseGlow = spec.glow.map((m) => m.emissiveIntensity);
  let suckP = 0;
  let chargeK = 0;
  let pull = 0; // 0 → 1：最後一下「咻」入吸塵機（捉到之後）
  const nozzle = new THREE.Vector3();
  let hasNozzle = false;
  g.userData = {
    type, height: spec.height, floating: true, mid,
    update(t) {
      body.position.y = 0.7 - mid + (suckP > 0 ? 0 : Math.sin(t * 1.8 + type.weight) * 0.12); // 浮喺半空（俾吸住就唔再浮）
      spec.update(t);
      // 俾吸緊：轉身向住吸塵機嘴 → 拉長 + 震 + 縮細 + 變光
      if (hasNozzle && (suckP > 0 || pull > 0)) {
        aim.lookAt(tmpV.copy(nozzle));
        const k = Math.min(1, suckP + pull);
        const wob = Math.sin(t * 38) * 0.06 * k;
        const shrink = 1 - suckP * 0.35 - pull * 0.6;
        aim.scale.set(shrink * (1 - k * 0.32 + wob), shrink * (1 - k * 0.32 - wob), shrink * (1 + k * 1.1 + pull * 2.5));
        aim.position.set(Math.sin(t * 47) * 0.05 * k, mid + Math.cos(t * 53) * 0.05 * k, 0); // 掙扎中震
        body.rotation.z = Math.sin(t * 9) * 0.25 * k;
      } else {
        aim.quaternion.identity();
        aim.scale.setScalar(1);
        aim.position.set(0, mid, 0);
        body.rotation.z *= 0.9;
      }
      body.rotation.y += ((suckP > 0 || pull > 0 ? Math.PI : 0) - body.rotation.y) * 0.15; // 俾吸住：塊面轉向你（掙扎緊）
      suckGlow.material.opacity = Math.min(0.5, (suckP * 0.35 + pull * 0.4) * (0.8 + Math.sin(t * 30) * 0.2));
      spec.glow.forEach((m, i) => (m.emissiveIntensity = baseGlow[i] * (1 + suckP * 1.5 + chargeK)));
      telegraph.material.opacity = chargeK * (0.45 + Math.sin(t * 25) * 0.15);
      telegraph.scale.setScalar(0.3 + chargeK * 0.5);
    },
    // p 0→1：吸幾多；at：吸塵機嘴嘅世界座標（拉長嘅方向）
    suck(p, at) {
      suckP = THREE.MathUtils.clamp(p, 0, 1);
      if (at) {
        nozzle.copy(at);
        hasNozzle = true;
      }
    },
    // 捉到之後「咻」入去：k 0→1
    pull(k, at) {
      pull = THREE.MathUtils.clamp(k, 0, 1);
      if (at) {
        nozzle.copy(at);
        hasNozzle = true;
      }
    },
    charge(k) {
      chargeK = THREE.MathUtils.clamp(k, 0, 1);
    },
  };
  return g;
}

// 慢慢飛嘅靈魂光球：發射嗰陣鎖定目標位置（唔會追你），所以好易閃
// warning 秒：喺原位發光變大（提示），之後先飛
export function launchSoulOrb(scene, from, to, color = 0xd500f9, { speed = HALLOWEEN_SOUL_ORB_SPEED, warning = HALLOWEEN_SOUL_ORB_WARNING } = {}) {
  const g = new THREE.Group();
  const core = sph(g, 0.18, 0.18, 0.18, G(color, 3), 0, 0, 0);
  const halo = sph(g, 0.36, 0.36, 0.36, ADD(color, 0.45), 0, 0, 0, true);
  core.castShadow = halo.castShadow = false;
  g.position.copy(from);
  scene.add(g);
  const dir = to.clone().sub(from);
  const dist = dir.length();
  dir.normalize();
  let t = 0;
  let travelled = 0;
  const orb = {
    group: g,
    position: g.position,
    flying: false,
    radius: 0.36, // 撞到嘅範圍
    update(dt) {
      t += dt;
      if (t < warning) {
        const k = t / warning;
        g.scale.setScalar(0.3 + k * 0.9);
        halo.material.opacity = 0.3 + Math.sin(t * 30) * 0.2;
        return 'charging';
      }
      orb.flying = true;
      const step = speed * dt;
      g.position.addScaledVector(dir, step);
      travelled += step;
      halo.scale.setScalar(0.36 * (1 + Math.sin(t * 12) * 0.15));
      if (travelled >= dist + 2) {
        orb.dispose();
        return 'done';
      }
      return 'flying';
    },
    dispose() {
      scene.remove(g);
    },
  };
  return orb;
}
