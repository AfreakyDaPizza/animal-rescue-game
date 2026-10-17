// Eclipse 日蝕活動（小朋友 2026-10-17）：
// 開始：太陽同月亮喺天上慢慢靠埋、啱啱好重疊（日冕光環）→ 射一條 DNA 咁扭嘅激光落 Hub
// 活動期間：成個地圖變日蝕色（暗紫紅天、太陽變黑圓 + 白色日冕）；每 8–12 秒一條 DNA 激光打落嚟：
//   打中地塊寵物／野生動物 → 🌑 ECLIPSE 變異（x6 錢）；打中你 → 彈飛返 Hub（唔會冇咗寵物）
//   激光落之前 1.5 秒地上有個警告圈，快啲走開！
// 用法（main.js）：createEclipse(scene)；每格 updateEclipse(...)；updateDayNight 之後 applyEclipseSky(...)；
// 活動開始時 playEclipseIntro(...)

import * as THREE from 'three';

const DIR = new THREE.Vector3(0.35, 0.55, -0.76).normalize(); // 日蝕喺天上邊個方向
const SKY_DIST = 300; // 離鏡頭幾遠（鏡頭 far = 500）
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 圓形漸變光（日冕／太陽光暈）
function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, inner, 64, 64, outer);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.15, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(234,128,252,0.55)');
  g.addColorStop(1, 'rgba(120,0,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,240,180,0.6)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEclipse(scene) {
  const ec = { scene, k: 0, align: 1, strikes: [], nextStrike: 4, sky: new THREE.Group(), lasers: [] };
  // 天上：太陽（黃光波）、月亮（黑波）、日冕（兩個重疊先最光）
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });
  ec.sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), sunMat);
  ec.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffe082, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  ec.sunGlow.scale.setScalar(70);
  ec.moonBall = new THREE.Mesh(new THREE.SphereGeometry(14.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0x07020f, fog: false }));
  ec.corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(20, 64), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  ec.corona.scale.setScalar(90);
  // 日冕嘅光芒（一條條向外射）
  ec.rays = new THREE.Group();
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xf3e5f5, transparent: true, opacity: 0.5, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 36), rayMat);
    ray.geometry.translate(0, 34, 0);
    ray.rotation.z = (i / 16) * Math.PI * 2;
    ec.rays.add(ray);
  }
  ec.rays.userData.mat = rayMat;
  for (const o of [ec.sunGlow, ec.sunBall, ec.corona, ec.rays, ec.moonBall]) ec.sky.add(o);
  ec.sky.visible = false;
  ec.sky.renderOrder = 2;
  scene.add(ec.sky);
  return ec;
}

// DNA 激光：兩條扭住嘅光管 + 中間一格格嘅「橫檔」（好似 DNA）
const helixMats = [0xea80fc, 0x18ffff].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
const rungMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
const coreMat = new THREE.MeshBasicMaterial({ color: 0xf8e1ff, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
export function makeHelixLaser(from, to, radius = 1.4) {
  const g = new THREE.Group();
  const len = from.distanceTo(to);
  const turns = Math.max(6, len / 9);
  // 喺本地座標起（沿 +y），再轉去 from → to
  for (let s = 0; s < 2; s++) {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const k = i / 160;
      const a = k * turns * Math.PI * 2 + s * Math.PI;
      pts.push(V(Math.cos(a) * radius, k * len, Math.sin(a) * radius));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.32, 6), helixMats[s]);
    g.add(tube);
  }
  const rungs = Math.floor(turns * 4);
  for (let i = 0; i < rungs; i++) {
    const k = (i + 0.5) / rungs;
    const a = k * turns * Math.PI * 2;
    const r = new THREE.Mesh(new THREE.BoxGeometry(radius * 2, 0.14, 0.14), rungMat);
    r.position.y = k * len;
    r.rotation.y = -a;
    g.add(r);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, len, 8, 1, true), coreMat);
  core.position.y = len / 2;
  g.add(core);
  // 由 to（地面）向 from（天）
  g.position.copy(to);
  g.quaternion.setFromUnitVectors(V(0, 1, 0), from.clone().sub(to).normalize());
  return g;
}

// 天上日蝕嘅位（跟住鏡頭，所以永遠喺天邊）
export const eclipseSkyPos = (camera, out = new THREE.Vector3()) => out.copy(camera.position).addScaledVector(DIR, SKY_DIST);

// 地上嘅警告圈
const warnMat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
function warnRing() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.7, 40), warnMat.clone());
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  fill.rotation.x = -Math.PI / 2;
  g.add(fill);
  g.userData = { ring, fill };
  return g;
}

export const STRIKE_RADIUS = 2.7; // 激光打中幾闊

// 每格畫面
// ctx：{ active（活動進行中）, playing（唔係暫停）, camera, pickTarget() → { pos, groundY }, onStrike(pos) }
export function updateEclipse(ec, dt, time, ctx) {
  const target = ctx.active || ec.intro ? 1 : 0;
  ec.k += (target - ec.k) * Math.min(1, dt * (target ? 0.8 : 1.5));
  if (ec.k < 0.01 && !ctx.active) {
    ec.sky.visible = false;
    for (const s of ec.strikes) cleanStrike(ec, s);
    ec.strikes.length = 0;
    return;
  }
  // 天上：跟住鏡頭；align 0 = 太陽月亮分開，1 = 啱啱好重疊
  ec.sky.visible = true;
  eclipseSkyPos(ctx.camera, ec.sky.position);
  ec.sky.lookAt(ctx.camera.position);
  const sep = (1 - ec.align) * 70;
  ec.sunBall.position.set(sep / 2, 0, 0);
  ec.sunGlow.position.copy(ec.sunBall.position);
  ec.moonBall.position.set(-sep / 2, 0, 2); // 喺太陽前面少少
  const full = Math.max(0, (ec.align - 0.85) / 0.15); // 啱啱重疊先出日冕
  ec.corona.material.opacity = full * ec.k;
  ec.rays.visible = full > 0.05;
  ec.rays.rotation.z = time * 0.05;
  ec.rays.userData.mat.opacity = 0.45 * full * ec.k;
  ec.sunGlow.material.opacity = (1 - full * 0.9) * ec.k;
  ec.sunBall.visible = full < 0.98;

  // 激光：動畫 + 定時打落嚟
  for (const l of [...ec.lasers]) {
    l.t += dt;
    l.g.children.forEach((c, i) => c.material && i < 2 && (c.rotation.y = time * 4));
    const fade = l.t < l.life - 0.4 ? 1 : Math.max(0, (l.life - l.t) / 0.4);
    l.g.scale.x = l.g.scale.z = 0.3 + fade * 0.7 + Math.sin(time * 30) * 0.05;
    if (l.t >= l.life) {
      ec.scene.remove(l.g);
      ec.lasers.splice(ec.lasers.indexOf(l), 1);
    }
  }
  if (!ctx.active || !ctx.playing) return;
  ec.nextStrike -= dt;
  if (ec.nextStrike <= 0) {
    ec.nextStrike = 8 + Math.random() * 4;
    const t = ctx.pickTarget();
    if (t) {
      const ring = warnRing();
      ring.position.set(t.pos.x, t.groundY + 0.06, t.pos.z);
      ec.scene.add(ring);
      ec.strikes.push({ pos: V(t.pos.x, t.groundY, t.pos.z), ring, t: 0 });
      ctx.onWarn?.(t.pos);
    }
  }
  for (const s of [...ec.strikes]) {
    s.t += dt;
    const { ring, fill } = s.ring.userData;
    ring.material.opacity = 0.4 + Math.abs(Math.sin(s.t * 10)) * 0.5;
    fill.material.opacity = 0.1 + (s.t / 1.5) * 0.3;
    s.ring.scale.setScalar(1 + Math.sin(s.t * 8) * 0.04);
    if (s.t >= 1.5 && !s.hit) {
      s.hit = true;
      laserAt(ec, ctx.camera, s.pos, 1.1);
      ctx.onStrike(s.pos);
    }
    if (s.t >= 2.2) {
      cleanStrike(ec, s);
      ec.strikes.splice(ec.strikes.indexOf(s), 1);
    }
  }
}
function cleanStrike(ec, s) {
  ec.scene.remove(s.ring);
}

// 一條由天上日蝕射落 at 嘅 DNA 激光
export function laserAt(ec, camera, at, life = 1.2, radius = 1.4) {
  const from = eclipseSkyPos(camera).sub(at).setLength(200).add(at); // 由日蝕方向射落嚟（200 米長）
  const g = makeHelixLaser(from, at, radius);
  ec.scene.add(g);
  ec.lasers.push({ g, t: 0, life });
  return g;
}

// 成個地圖變日蝕色（updateDayNight 之後叫）
const ECL_BG = new THREE.Color(0x3a0d2e);
const ECL_TOP = new THREE.Color(0x12001f);
export function applyEclipseSky(ec, scene, skyUniforms, hemi, sun) {
  const k = ec.k;
  if (k <= 0.001) return;
  scene.background.lerp(ECL_BG, k * 0.9);
  scene.fog.color.copy(scene.background);
  skyUniforms.bottom.value.copy(scene.background);
  skyUniforms.top.value.lerp(ECL_TOP, k);
  hemi.intensity *= 1 - 0.5 * k;
  sun.intensity *= 1 - 0.65 * k;
}

// ================= 開始動畫：太陽月亮對齊 → DNA 激光射落 Hub =================
export function playEclipseIntro({ ec, camera, playMovie, once, shake, play, onDone }) {
  ec.intro = true;
  ec.align = 0;
  const HUB = V(0, 0, 24);
  const look = () => eclipseSkyPos(camera);
  playMovie(camera, {
    length: 13,
    skipText: 'Click or press any key to keep playing ▶',
    shots: [
      [0, 6.5, { p: V(0, 3, 40), l: V(0, 3, 40).addScaledVector(DIR, 100) }, { p: V(0, 2.6, 38), l: V(0, 2.6, 38).addScaledVector(DIR, 100) }], // 望上天：太陽同月亮慢慢靠埋
      [6.5, 13, { p: V(34, 22, 66), l: V(0, 2, 24) }, { p: V(30, 18, 60), l: V(0, 4, 24) }], // DNA 激光射落 Hub
    ],
    captions: [
      [0.3, 'Look at the sky... the Sun and the Moon are lining up! 🌞🌑'],
      [5.2, '🌑 TOTAL ECLIPSE! 🌑'],
      [6.5, 'A DNA laser hits the Hub! The ECLIPSE event has begun!'],
      [10, 'Machines are 20x faster... and lasers can give pets the 🌑 ECLIPSE mutation!'],
    ],
    update(t) {
      ec.align = Math.min(1, t / 5.2);
      if (t > 5.2 && once('total')) {
        play('magic');
        shake(0.12);
      }
      if (t > 6.6 && once('laser')) {
        laserAt(ec, camera, HUB, 6, 3.2);
        play('rumble');
        shake(0.5);
      }
      void look;
      return null;
    },
    onDone() {
      ec.intro = false;
      ec.align = 1;
      onDone?.();
    },
  });
}
