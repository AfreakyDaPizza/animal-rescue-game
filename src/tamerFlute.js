// 🎵 Tamer Ranger 吹笛（小朋友 GitHub Issue #17：「The tamer skin should have a special animation where the ranger plays a flute」）
// 一支橫笛擺喺嘴邊（打側）、雙手舉起揸住、手指一上一落按笛孔、頭同身跟住節奏擺、♪ 音符由笛尾飄上天
// 幾時吹：
//   1. 🧢 著住 Tamer Ranger 企定 FLUTE_IDLE_SECONDS 秒（第三身 + 第一身都得；一郁就收）→ thirdPerson.js 叫
//   2. 🤠 Catch & Tame 馴服緊動物（馴服條滿緊）→ rodeo.js 叫（著 Tamer 就用呢個靚版；其他皮膚用 rodeo.js 本身嗰支細笛 + 音符）
// 用法：const f = createFlute(avatar)；每格 fluteFrame(f, dt, { on, third, eye, carry, sound })；stopFlute(f) 即刻收
// The kid can change the numbers below (English comments).

import * as THREE from 'three';
import { addSounds, play } from './sound.js';

export const FLUTE_IDLE_SECONDS = 4; // 🧢 stand still this many seconds (Tamer skin) and your ranger plays the flute
const NOTE_EVERY = 0.38; // seconds between ♪ music notes
const NOTE_LIFE = 1.7; // how long a ♪ floats before it fades away
const NOTE_RISE = 1.1; // how fast a ♪ floats up (metres per second)
const SONG = [0, 2, 4, 7, 4, 5, 4, 2, 0, 2, 4, 2, 7, 9, 7, 4]; // 🎶 the idle tune (steps on a happy scale)

// ---------- 🎶 聲：柔和嘅笛聲（企定吹嗰陣，細聲啲）----------
const SCALE = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319];
addSounds(Object.fromEntries(SCALE.map((f, i) => [`tamerFlute${i}`, (t, { tone }) => {
  tone(f, t, 0.36, { type: 'sine', vol: 0.045, slide: 1.004 });
  tone(f * 2, t, 0.22, { type: 'sine', vol: 0.012 });
  tone(f * 1.003, t + 0.03, 0.3, { type: 'triangle', vol: 0.012 }); // 少少氣聲
}])));

// ---------- 🪈 笛（沿住 x 軸，0 = 吹口）----------
const WOOD = new THREE.MeshStandardMaterial({ color: 0xd08c48, roughness: 0.5 });
const WOOD_D = new THREE.MeshStandardMaterial({ color: 0x6d3d1a, roughness: 0.6 });
const GOLD = new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.3, metalness: 0.7, emissive: 0x6a4300, emissiveIntensity: 0.25 });
const HOLE = new THREE.MeshBasicMaterial({ color: 0x24140a });
const B = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
function part(parent, geo, mat, x, y, z, sx, sy, sz, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.z = rz;
  m.castShadow = true;
  parent.add(m);
  return m;
}
const LEN = 1.3;
function buildFluteModel(fingerMat) {
  const g = new THREE.Group();
  part(g, CYL, WOOD, LEN / 2, 0, 0, 0.09, LEN, 0.09, Math.PI / 2); // 笛身
  for (const x of [0.02, 0.45, LEN - 0.02]) part(g, CYL, GOLD, x, 0, 0, 0.105, 0.06, 0.105, Math.PI / 2); // 金環
  part(g, CYL, WOOD_D, LEN + 0.015, 0, 0, 0.07, 0.02, 0.07, Math.PI / 2); // 笛尾
  part(g, B, HOLE, 0.15, 0.046, 0, 0.06, 0.012, 0.05); // 吹口
  const holes = [];
  for (let i = 0; i < 6; i++) holes.push(part(g, B, HOLE, 0.56 + i * 0.1, 0.045, 0, 0.035, 0.01, 0.035));
  // 手指（一粒粒細方塊，按住笛孔，一上一落）
  const fingers = [];
  if (fingerMat) for (let i = 0; i < 6; i++) {
    const f = part(g, B, fingerMat, 0.56 + i * 0.1, 0.085, 0.0, 0.065, 0.05, 0.12);
    fingers.push(f);
  }
  // 細蝴蝶結（紅絲帶，配 Tamer 頸巾）
  part(g, B, new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.7 }), LEN - 0.12, -0.06, 0, 0.05, 0.12, 0.03, 0.3);
  g.userData.fingers = fingers;
  g.userData.tip = new THREE.Vector3(LEN + 0.05, 0.05, 0);
  return g;
}

// ---------- ♪ 音符（canvas 字 → Sprite）----------
let noteTex = null;
function noteTextures() {
  if (noteTex) return noteTex;
  noteTex = ['♪', '♫', '♬', '♩'].map((ch) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 52px "Segoe UI Symbol", "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(40, 20, 10, 0.85)';
    ctx.strokeText(ch, 32, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return noteTex;
}
const NOTE_COLORS = [0xffd54f, 0xff80ab, 0x80d8ff, 0xb9f6ca, 0xffab40];

export function createFlute(avatar) {
  const flute = buildFluteModel(avatar.mats.skin);
  flute.visible = false;
  // 頭嘅座標：嘴喺 (0, -0.16, -0.34)；笛由嘴邊向右前方伸出去（打側吹）
  flute.position.set(-0.17, -0.16, -0.43);
  flute.rotation.set(0, 0.25, 0.05);
  avatar.head.add(flute);
  // 第一身：右下角見到支笛（掛喺「眼」鏡頭）
  const fp = buildFluteModel(null);
  fp.visible = false;
  fp.scale.setScalar(0.45);
  fp.position.set(-0.08, -0.26, -0.5);
  fp.rotation.set(0.15, 0.55, 0.12);
  const notes = [];
  return { avatar, flute, fp, notes, k: 0, t: 0, noteT: 0, step: 0, on: false };
}

const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const mix = (a, b, k) => a + (b - a) * k;
// 隻手由膊頭指去 target（torso 座標）：計 rotation.x / rotation.z（手係一嚿直嘅方塊，向下 0.82 米）
function aimArm(arm, tx, ty, tz, k) {
  _s.copy(arm.position);
  _v.set(tx - _s.x, ty - _s.y, tz - _s.z).normalize();
  const phi = Math.asin(THREE.MathUtils.clamp(_v.x, -1, 1));
  const theta = Math.atan2(-_v.z, -_v.y);
  arm.rotation.x = mix(arm.rotation.x, theta, k);
  arm.rotation.y = mix(arm.rotation.y, 0, k);
  arm.rotation.z = mix(arm.rotation.z, phi, k);
}

// 每格叫：on = 想唔想吹；third = 第三身；eye = 第一身鏡頭（掛支細笛）；carry = 音符跟住飄嘅速度（Catch & Tame 跑緊）
export function fluteFrame(f, dt, { on = false, third = true, eye = null, carry = null, sound = false, quick = false } = {}) {
  const av = f.avatar;
  f.on = on;
  f.k = THREE.MathUtils.clamp(f.k + (on ? 1 : -1) * dt * (quick ? 12 : on ? 3.2 : 6), 0, 1);
  f.t += dt;
  const k = f.k * f.k * (3 - 2 * f.k); // smoothstep
  const show = k > 0.02;
  f.flute.visible = show && third;
  f.flute.scale.setScalar(0.3 + 0.7 * k);
  if (eye && f.fp.parent !== eye) eye.add(f.fp);
  f.fp.visible = show && !third;
  if (show) {
    const t = f.t;
    const beat = t * 2 * Math.PI / (NOTE_EVERY * 2);
    if (third) {
      // 🙌 雙手舉起揸住支笛：左手近嘴、右手喺笛尾嗰邊；跟住節奏一上一落（按笛孔）
      const bobL = Math.sin(beat) * 0.03;
      const bobR = Math.sin(beat + Math.PI) * 0.03;
      const [AL, AR] = av.arms;
      aimArm(AL, 0.14, 2.0 + bobL, -0.5, k);
      aimArm(AR, 0.72, 2.02 + bobR, -0.66, k);
      av.elbows.forEach((e) => e.rotation.set(0, 0, 0));
      // 頭少少側、跟節奏點頭；身體左右擺
      av.head.rotation.x = mix(av.head.rotation.x, 0.06 + Math.sin(beat * 0.5) * 0.05, k);
      av.head.rotation.y = mix(av.head.rotation.y, -0.12, k);
      av.head.rotation.z = mix(av.head.rotation.z, -0.12 + Math.sin(beat * 0.5) * 0.06, k);
      av.torso.rotation.z = mix(av.torso.rotation.z, Math.sin(beat * 0.5) * 0.05, k);
      av.torso.rotation.y = mix(av.torso.rotation.y, 0.1, k);
      // 手指：每次一隻抬起（好似真係吹緊唔同音）
      const lift = Math.floor(t / (NOTE_EVERY / 2)) % 6;
      f.flute.userData.fingers.forEach((fi, i) => (fi.position.y = 0.085 + (i === lift || i === (lift + 3) % 6 ? 0.06 : 0)));
    } else {
      f.fp.position.y = -0.26 + Math.sin(beat) * 0.008;
      f.fp.rotation.z = 0.12 + Math.sin(beat * 0.5) * 0.04;
    }
    // ♪ 音符
    if (on && dt > 0) {
      f.noteT -= dt;
      if (f.noteT <= 0) {
        f.noteT = NOTE_EVERY * (0.85 + Math.random() * 0.3);
        spawnNote(f, third ? f.flute : f.fp);
        if (sound) {
          play(`tamerFlute${SONG[f.step % SONG.length]}`);
          f.step++;
        }
      }
    }
  }
  updateNotes(f, dt, carry);
}

function spawnNote(f, from) {
  const root = f.avatar.g.parent;
  if (!root) return;
  let n = f.notes.find((x) => !x.sprite.visible);
  if (!n) {
    if (f.notes.length >= 14) return;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
    n = { sprite, age: 0, vx: 0, vz: 0, wob: 0 };
    f.notes.push(n);
  }
  if (n.sprite.parent !== root) root.add(n.sprite);
  const tex = noteTextures();
  n.sprite.material.map = tex[Math.floor(Math.random() * tex.length)];
  n.sprite.material.color.setHex(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);
  n.sprite.material.needsUpdate = true;
  from.updateMatrixWorld(true);
  from.localToWorld(_v.copy(from.userData.tip));
  if (from === f.fp && from.parent) {
    // 第一身：音符喺前面少少先出（唔好喺個鏡頭面前爆大）
    from.parent.getWorldDirection(_s);
    _v.addScaledVector(_s, 1.6);
    _v.y += 0.3;
  }
  n.sprite.position.copy(_v);
  n.sprite.visible = true;
  n.age = 0;
  n.vx = (Math.random() - 0.5) * 0.5;
  n.vz = (Math.random() - 0.5) * 0.5;
  n.wob = Math.random() * 6;
}

function updateNotes(f, dt, carry) {
  for (const n of f.notes) {
    if (!n.sprite.visible) continue;
    n.age += dt;
    const k = n.age / NOTE_LIFE;
    if (k >= 1) {
      n.sprite.visible = false;
      continue;
    }
    const p = n.sprite.position;
    p.y += NOTE_RISE * dt;
    p.x += (n.vx + Math.sin(n.age * 5 + n.wob) * 0.5) * dt + (carry ? carry.x * dt : 0);
    p.z += n.vz * dt + (carry ? carry.z * dt : 0);
    const s = 0.22 + Math.min(1, k * 5) * 0.2;
    n.sprite.scale.set(s, s, s);
    n.sprite.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    n.sprite.material.rotation = Math.sin(n.age * 4 + n.wob) * 0.35;
  }
}

// 即刻收埋（離開 Catch & Tame、換皮膚…）
export function stopFlute(f) {
  f.k = 0;
  f.on = false;
  f.flute.visible = false;
  f.fp.visible = false;
  for (const n of f.notes) n.sprite.visible = false;
}
