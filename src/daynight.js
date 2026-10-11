// 日夜：跟真實時鐘每 5 分鐘入夜，生態區重置（每個生態區換過新動物）

import * as THREE from 'three';

// ---- 時間（秒）----
export const DAY_LENGTH = 5 * 60; // 白天幾耐先入夜（原稿：每 5 分鐘）
export const NIGHT_LENGTH = 20;   // 夜晚有幾耐（原稿冇講，暫定 20 秒）
const FADE = 3;                   // 天光／天黑要幾秒慢慢變

const DAY = {
  sky: new THREE.Color(0xcfeaff),    // 地平線
  skyTop: new THREE.Color(0x3d8fe0), // 頭頂
  hemi: 1.3,
  sun: 2.2,
  sunColor: new THREE.Color(0xfff1d6),
};
const NIGHT = {
  sky: new THREE.Color(0x1a2348),
  skyTop: new THREE.Color(0x050814),
  hemi: 0.3,
  sun: 0.45,
  sunColor: new THREE.Color(0x8fa8ff), // 月光偏藍
};

// 跟真實時鐘（小朋友 2026-10-11）：每個整 5 分鐘（例如 4:00、4:05）入夜，夜晚維持 NIGHT_LENGTH 秒
const CYCLE = DAY_LENGTH;
export function createDayNight({ scene, hemi, sun, sky }, onNight, onDay) {
  return { scene, hemi, sun, sky, onNight, onDay, isNight: false, timeLeft: DAY_LENGTH, blend: 0, offset: 0 };
}

// 而家係第幾段白天（每段 5 分鐘）：用嚟定動物（F5 唔換）
export const dayCycle = (dn) => Math.floor((Date.now() + dn.offset) / (CYCLE * 1000));

// 下一次入夜係幾點（例如 4:05）
export function nextNightClock(dn) {
  const now = Date.now() + dn.offset;
  const next = Math.ceil(now / (CYCLE * 1000)) * CYCLE * 1000;
  return new Date(next).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// blend：0 = 白天，1 = 夜晚
export function updateDayNight(dn, dt) {
  const phase = ((Date.now() + dn.offset) / 1000) % CYCLE;
  const night = phase < NIGHT_LENGTH;
  dn.timeLeft = night ? NIGHT_LENGTH - phase : CYCLE - phase;
  if (night !== dn.isNight) {
    dn.isNight = night;
    if (night) dn.onNight();
    else dn.onDay?.();
  }

  const target = dn.isNight ? 1 : 0;
  dn.blend += Math.sign(target - dn.blend) * Math.min(Math.abs(target - dn.blend), dt / FADE);

  const b = dn.blend;
  dn.scene.background.lerpColors(DAY.sky, NIGHT.sky, b);
  dn.scene.fog.color.copy(dn.scene.background);
  if (dn.sky) {
    dn.sky.uniforms.bottom.value.copy(dn.scene.background);
    dn.sky.uniforms.top.value.lerpColors(DAY.skyTop, NIGHT.skyTop, b);
  }
  dn.hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, b);
  dn.sun.intensity = THREE.MathUtils.lerp(DAY.sun, NIGHT.sun, b);
  dn.sun.color.lerpColors(DAY.sunColor, NIGHT.sunColor, b);
}

// 「4:59」咁嘅格式
export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
