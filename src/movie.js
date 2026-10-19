// 細電影（Issue #2：開門動畫、結局動畫）：同開場動畫一樣嘅電影感
// 上下黑邊、鏡頭由 from 慢慢移去 to、轉鏡頭閃黑、旁白字幕、對白泡泡、畫面震、最後黑畫面大字
// 用法：playMovie({ length, shots, captions, lines, update, onDone, final })；撳任何掣／滑鼠跳過

import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
export const movie = { active: false };

const ease = (k) => k * k * (3 - 2 * k);
const headPos = new THREE.Vector3();

// shots：[開始, 完, { p, l }, { p, l }]；captions：[開始, 字]；lines：[開始, 完, () => 個頭 Object3D, 字, 'owner'|'ranger']
// final：{ at, html, length }（黑畫面大字，喺 at 秒開始變黑）
export function playMovie(camera, opts) {
  Object.assign(movie, {
    active: true, time: 0, camera, lookAt: new THREE.Vector3(), lastShot: -2, shake: 0, cues: new Set(), ...opts,
  });
  document.body.classList.add('intro', 'movie');
  const el = $('movie');
  el.hidden = false;
  $('movie-final').classList.remove('show');
  $('movie-final').innerHTML = opts.final?.html || '';
  $('movie-fade').style.opacity = 0;
  $('movie-skip').textContent = opts.skipText || 'Click or press any key to skip ▶';
  // 頭 0.6 秒唔俾跳（防止撳緊掣即刻跳咗）
  const skip = () => {
    if (movie.time > 0.6) finishMovie();
  };
  movie.skipHandler = skip;
  window.addEventListener('keydown', skip);
  el.addEventListener('click', skip);
}

// 某個時間只做一次（例如出聲）
export const once = (key) => !movie.cues.has(key) && movie.cues.add(key);
export const shake = (amount) => (movie.shake = Math.max(movie.shake, amount));

export function updateMovie(dt) {
  if (!movie.active) return;
  dt *= movie.timeScale ?? 1; // 測試用：慢鏡（game.movie.timeScale）
  movie.time += dt;
  const t = movie.time;
  const follow = movie.update?.(t, dt);

  // 字幕
  const cap = [...(movie.captions || [])].reverse().find(([a]) => t >= a);
  caption(cap && (!movie.final || t < movie.final.at) ? cap[1] : '');

  // 鏡頭
  const cam = movie.camera;
  const i = movie.shots.findIndex(([a, b]) => t >= a && t < b);
  if (i !== movie.lastShot) {
    movie.lastShot = i;
    const blink = $('movie-blink');
    blink.classList.remove('on');
    void blink.offsetWidth;
    blink.classList.add('on');
  }
  if (i >= 0) {
    const [a, b, from, to] = movie.shots[i];
    const k = ease((t - a) / (b - a));
    cam.position.lerpVectors(from.p, to.p, k);
    movie.lookAt.lerpVectors(from.l, to.l, k);
  } else if (follow) {
    cam.position.lerp(follow[0], Math.min(1, dt * 3));
    movie.lookAt.lerp(follow[1], Math.min(1, dt * 3));
  }
  movie.shake = Math.max(0, movie.shake - dt * 0.6);
  if (movie.shake > 0) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * movie.shake, (Math.random() - 0.5) * movie.shake, (Math.random() - 0.5) * movie.shake));
  cam.lookAt(movie.lookAt);

  updateBubble(t);

  // 最後：黑畫面 + 大字
  const fin = movie.final;
  if (fin && t > fin.at) {
    $('movie-fade').style.opacity = Math.min(1, (t - fin.at) / 1.2);
    if (t > fin.at + 1.3) $('movie-final').classList.add('show');
  }
  if (t > movie.length) finishMovie();
}

function caption(text) {
  const el = $('movie-caption');
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  if (text) el.classList.add('show');
}

function updateBubble(t) {
  const el = $('movie-bubble');
  const line = (movie.lines || []).find(([a, b]) => t >= a && t < b);
  if (!line) {
    el.classList.remove('show');
    return;
  }
  const [a, , head, text, who] = line;
  head().getWorldPosition(headPos);
  headPos.y += 1.1;
  movie.camera.updateMatrixWorld();
  headPos.project(movie.camera);
  const shown = text.slice(0, Math.floor((t - a) * 28)); // 一個一個字出
  if (el.dataset.text !== shown) {
    el.dataset.text = shown;
    el.textContent = shown;
    el.classList.toggle('ranger', who === 'ranger');
  }
  el.classList.toggle('show', headPos.z < 1 && shown.length > 0);
  el.style.left = `${Math.min(0.85, Math.max(0.15, headPos.x * 0.5 + 0.5)) * 100}%`;
  el.style.top = `${Math.min(0.75, Math.max(0.3, -headPos.y * 0.5 + 0.5)) * 100}%`; // 唔好俾上面黑邊遮住對白
}

export function finishMovie() {
  if (!movie.active) return;
  movie.active = false;
  window.removeEventListener('keydown', movie.skipHandler);
  $('movie').removeEventListener('click', movie.skipHandler);
  $('movie').hidden = true;
  $('movie-bubble').classList.remove('show');
  $('movie-final').classList.remove('show');
  caption('');
  document.body.classList.remove('intro', 'movie');
  movie.onDone?.();
}
