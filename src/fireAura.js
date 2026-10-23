// ✨ 變異特效（小朋友 Issue #14：「每個變異都要有自己嘅動畫」）
// 用法（同以前一樣）：addFireAura(model, 'astral')（或者 'fire+eclipse'）；main.js 每格畫面叫 animateFireAuras(time)
// 🔥 Fire：火舌一路升 + 火星 + 地上一圈火光
// 🌑 Eclipse：頭頂一個黑太陽（白紫色光邊）+ 轉緊嘅日冕光芒 + 兩個一閃一閃嘅光環 + 黑紫煙 + 光點被吸入黑太陽
// 👻 Spectral：半透明青色「鬼影分身」一個接一個飄走 + 鬼火繞圈
// 🟣 Phantom：紫色煙螺旋升上去 + 每隔幾秒「瞬間移動」一閃（寵物消失一下、一個紫色光圈由腳掃到頭）
// ☄️ Meteoric：四粒藍色細隕石（有尾巴）繞圈飛 + 地上藍水晶碎 + 藍色電火花
// 🌌 Astral：斜斜一圈轉緊嘅星環 + 星座連線一閃一閃 + 後面一團星雲光
// 😈 Demonic：紅黑火 + 背後一對細蝙蝠翼拍拍下 + 一對發光彎角 + 地上一個轉緊嘅紅色符文圈
//
// 效能（地塊可以有好多隻寵物）：
// - 粒子全部用 THREE.Points（每種一個 draw call），物料／貼圖／形狀全部共用；分身、隕石、水晶、角、翼用 InstancedMesh
// - 唔加燈（加燈會令所有 shader 重新 compile）
// - 只郁「畫緊」嘅寵物（onBeforeRender 登記），遠嘅郁少啲、粒子少啲；畫質低（setAuraQuality）粒子少啲；疊咗幾種變異每種都減少粒子
// - 粒子大細跟寵物縮放（自己寫嘅 shader），所以地塊、手上、Hatch 動畫都啱 size

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- 畫質 ----------
// main.js 嘅 applyQuality 叫：3 高、2 中、1 低、0 最低
let quality = 3;
const QUALITY_MUL = [0.3, 0.55, 0.8, 1];
export function setAuraQuality(q) {
  quality = Math.max(0, Math.min(3, q | 0));
}

// ---------- 貼圖（用 canvas 畫，唔使載圖）----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const radial = (ctx, x, y, r, stops) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [k, c] of stops) g.addColorStop(k, c);
  return g;
};
const TEX = {};
function tex(name) {
  if (TEX[name]) return TEX[name];
  const make = {
    // 圓形柔光點
    glow: () => canvasTex(64, (ctx, n) => {
      ctx.fillStyle = radial(ctx, n / 2, n / 2, n / 2, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, n, n);
    }),
    // 火舌：下面圓、上面尖（好似水滴倒轉）
    flame: () => canvasTex(128, (ctx, n) => {
      ctx.save();
      ctx.translate(n / 2, n * 0.66);
      ctx.scale(1, 1.75);
      ctx.fillStyle = radial(ctx, 0, 0, n * 0.3, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.75)'], [0.75, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']]);
      ctx.beginPath();
      ctx.arc(0, 0, n * 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }),
    // 一團團煙
    smoke: () => canvasTex(128, (ctx, n) => {
      const blobs = [[0.5, 0.5, 0.34], [0.36, 0.56, 0.22], [0.64, 0.58, 0.22], [0.5, 0.36, 0.22], [0.42, 0.42, 0.18], [0.6, 0.42, 0.18]];
      for (const [x, y, r] of blobs) {
        ctx.fillStyle = radial(ctx, x * n, y * n, r * n, [[0, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(0, 0, n, n);
      }
    }),
    // 星星：四角閃光
    star: () => canvasTex(64, (ctx, n) => {
      const h = n / 2;
      ctx.fillStyle = radial(ctx, h, h, h * 0.5, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, n, n);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (const rot of [0, Math.PI / 2]) {
        ctx.save();
        ctx.translate(h, h);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(-h, 0);
        ctx.quadraticCurveTo(0, -n * 0.05, h, 0);
        ctx.quadraticCurveTo(0, n * 0.05, -h, 0);
        ctx.fill();
        ctx.restore();
      }
    }),
    // 🌑 黑太陽：黑色圓 + 白紫色光邊
    sun: () => canvasTex(256, (ctx, n) => {
      const h = n / 2;
      ctx.fillStyle = radial(ctx, h, h, h, [[0.3, 'rgba(234,128,252,0.9)'], [0.37, 'rgba(255,255,255,1)'], [0.43, 'rgba(206,147,216,0.85)'], [0.62, 'rgba(124,77,255,0.3)'], [1, 'rgba(74,20,140,0)']]);
      ctx.fillRect(0, 0, n, n);
      ctx.fillStyle = '#07000d';
      ctx.beginPath();
      ctx.arc(h, h, n * 0.355, 0, TAU);
      ctx.fill();
    }),
    // 🌑 日冕光芒：一條條由中間射出去（中間空心）
    rays: () => canvasTex(256, (ctx, n) => {
      const h = n / 2;
      ctx.translate(h, h);
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * TAU + Math.sin(i * 7.3) * 0.05;
        const len = h * (0.62 + 0.36 * fract(Math.sin(i * 12.9898) * 43758.5));
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        g.addColorStop(0.34, 'rgba(255,255,255,0)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = i % 3 ? 1.5 : 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
    }),
    // 🌌 星雲：幾團彩色光
    nebula: () => canvasTex(256, (ctx, n) => {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, n / 2, n / 2, n * 0.45, [[0, 'rgba(20,0,60,0.75)'], [0.6, 'rgba(26,0,70,0.45)'], [1, 'rgba(26,0,70,0)']]);
      ctx.fillRect(0, 0, n, n);
      const blobs = [[0.42, 0.45, 0.32, '124,77,255'], [0.6, 0.55, 0.28, '245,0,87'], [0.5, 0.62, 0.26, '0,176,255'], [0.55, 0.38, 0.22, '213,0,249'], [0.36, 0.6, 0.2, '83,109,254']];
      for (const [x, y, r, c] of blobs) {
        ctx.fillStyle = radial(ctx, x * n, y * n, r * n, [[0, `rgba(${c},0.55)`], [0.5, `rgba(${c},0.22)`], [1, `rgba(${c},0)`]]);
        ctx.fillRect(0, 0, n, n);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 40; i++) {
        const a = fract(Math.sin(i * 78.233) * 43758.5) * TAU;
        const r = Math.sqrt(fract(Math.sin(i * 12.9898) * 43758.5)) * n * 0.36;
        ctx.globalAlpha = 0.3 + 0.7 * fract(i * 0.618);
        ctx.fillRect(n / 2 + Math.cos(a) * r, n / 2 + Math.sin(a) * r, 1.5, 1.5);
      }
    }),
    // 😈 地上符文圈：兩個圓 + 一圈尖刺 + 細菱形（唔用五角星）
    runes: () => canvasTex(256, (ctx, n) => {
      const h = n / 2;
      ctx.translate(h, h);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.shadowColor = 'rgba(255,255,255,1)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.92, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.74, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.rotate((i / 12) * TAU);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.88);
        ctx.lineTo(h * 0.05, -h * 0.83);
        ctx.lineTo(0, -h * 0.78);
        ctx.lineTo(-h * 0.05, -h * 0.83);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * TAU;
        const r = i % 2 ? h * 0.42 : h * 0.7;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
    }),
  }[name];
  TEX[name] = make();
  return TEX[name];
}

// ---------- 粒子 shader（大細跟寵物縮放、霧、每粒自己顏色同透明度）----------
const halfH = { value: 400 }; // 畫面高度一半（像素），onBeforeRender 更新
const PVERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uHalfH;
varying vec3 vColor;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float ws = length(modelMatrix[0].xyz);
  gl_PointSize = aAlpha <= 0.003 ? 0.0 : aSize * ws * projectionMatrix[1][1] * uHalfH / max(0.05, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const PFRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
  gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
  if (gl_FragColor.a < 0.004) discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float ff = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float ff = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    #ifdef ADDITIVE
      gl_FragColor.a *= 1.0 - ff;
    #else
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ff);
    #endif
  #endif
}`;
const pointMats = {};
function pointMat(texName, additive) {
  const key = `${texName}|${additive}`;
  return (pointMats[key] ??= new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uMap: { value: tex(texName) }, uHalfH: halfH },
    vertexShader: PVERT,
    fragmentShader: PFRAG,
    defines: additive ? { ADDITIVE: '' } : {},
    transparent: true,
    depthWrite: false,
    fog: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
}

// ---------- 共用形狀同物料 ----------
const lin = (hex) => new THREE.Color(hex);
const unitPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); // 地上嘅圈
// 光環：三段光（轉起嚟睇得出喺度轉）
const ringGeo = (() => {
  const g = new THREE.TorusGeometry(1, 0.035, 6, 72);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const k = 0.22 + 0.78 * Math.pow(0.5 + 0.5 * Math.cos(a * 3), 2);
    col.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
})();
const additiveBasic = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...o });
const MAT = {
  fireGlow: additiveBasic({ color: 0xff6d00, map: tex('glow'), opacity: 0.5 }),
  eclipseRing: additiveBasic({ color: 0xb388ff, vertexColors: true, opacity: 0.95 }),
  sun: new THREE.SpriteMaterial({ map: tex('sun'), transparent: true, depthWrite: false }),
  rays: new THREE.SpriteMaterial({ map: tex('rays'), color: 0xd1a8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }),
  // 👻 分身：普通混色（光天白日都睇到），每個分身嘅透明度放喺 instanceColor 嘅光度
  ghost: (() => {
    const m = new THREE.MeshBasicMaterial({ color: 0xa7ffff, transparent: true, depthWrite: false });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n#ifdef USE_COLOR\n  diffuseColor = vec4(diffuse, opacity * max(vColor.r, max(vColor.g, vColor.b)));\n#endif');
    };
    return m;
  })(),
  phantomRing: additiveBasic({ color: 0xb388ff, vertexColors: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x1a237e, emissive: 0x2962ff, emissiveIntensity: 1.1, roughness: 0.6, flatShading: true }),
  crystal: new THREE.MeshStandardMaterial({ color: 0x80d8ff, emissive: 0x0091ea, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.9 }),
  starLines: new THREE.LineBasicMaterial({ color: 0xd1c4e9, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }),
  nebula: new THREE.SpriteMaterial({ map: tex('nebula'), transparent: true, depthWrite: false, opacity: 0.8 }), // 普通混色：日頭都見到深紫色星空
  horn: new THREE.MeshBasicMaterial({ vertexColors: true }),
  wing: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  runes: additiveBasic({ color: 0xff1744, map: tex('runes'), opacity: 0.6, side: THREE.DoubleSide }),
};
const rockGeo = new THREE.DodecahedronGeometry(1, 0);
const crystalGeo = new THREE.OctahedronGeometry(1, 0).scale(0.32, 1, 0.32).translate(0, 0.7, 0);
// 😈 彎角：一節節收窄，底深紅、尖端橙黃（MeshBasic = 自己發光）
const hornGeo = (() => {
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.04, 0.2, 0.02), V(0.14, 0.36, 0.08), V(0.28, 0.44, 0.18)]);
  const SEG = 10;
  const RAD = 8;
  const pos = [];
  const col = [];
  const idx = [];
  const c0 = lin(0x3d0000);
  const c1 = lin(0xff3d00);
  const c2 = lin(0xffd740);
  const c = new THREE.Color();
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const n = new THREE.Vector3(0, 0, 1).cross(tan).normalize();
    if (n.lengthSq() < 0.01) n.set(1, 0, 0);
    const b = tan.clone().cross(n).normalize();
    const r = 0.11 * (1 - t) + 0.006;
    if (t < 0.6) c.copy(c0).lerp(c1, t / 0.6);
    else c.copy(c1).lerp(c2, (t - 0.6) / 0.4);
    for (let j = 0; j < RAD; j++) {
      const a = (j / RAD) * TAU;
      pos.push(p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r, p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r, p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
    const a = i * RAD + j;
    const b2 = i * RAD + ((j + 1) % RAD);
    idx.push(a, a + RAD, b2, b2, a + RAD, b2 + RAD);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
})();
// 😈 蝙蝠翼：x 向外、平放（-z 向前），下面一條條波浪邊；翼根深色、外面紅色發光
const wingGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.05);
  s.quadraticCurveTo(0.18, 0.3, 0.42, 0.28);
  s.lineTo(0.62, 0.34);
  s.quadraticCurveTo(0.56, 0.16, 0.6, 0.02);
  s.quadraticCurveTo(0.5, 0.1, 0.42, 0.0);
  s.quadraticCurveTo(0.32, 0.1, 0.24, -0.04);
  s.quadraticCurveTo(0.14, 0.06, 0, -0.08);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 6); // 企喺 xy 平面：由後面同前面都睇到成塊翼
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(lin(0x1a0000)).lerp(lin(0xd50000), Math.pow(p.getX(i) / 0.62, 1.6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
})();
function V(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

// ---------- 小工具 ----------
// 一團粒子：seeds 每粒 4 個隨機數；位置等等每格寫
function cloud(e, n, texName, additive, { colors = null, center = e.c, radius = e.bound } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);
  const seeds = new Float32Array(n * 4).map(() => Math.random());
  const attr = (a, k) => new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr(pos, 3));
  geo.setAttribute('aColor', attr(col, 3));
  geo.setAttribute('aSize', attr(size, 1));
  geo.setAttribute('aAlpha', attr(alpha, 1));
  geo.boundingSphere = new THREE.Sphere(center.clone(), radius);
  if (colors) for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(seeds[i * 4 + 3] * colors.length) % colors.length];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pts = new THREE.Points(geo, pointMat(texName, additive));
  pts.renderOrder = additive ? 3 : 2;
  e.own.push(geo);
  return { pts, geo, pos, col, size, alpha, seeds, n };
}
function flush(cl, count, colorsToo = false) {
  cl.geo.setDrawRange(0, count);
  const a = cl.geo.attributes;
  a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
  if (colorsToo) a.aColor.needsUpdate = true;
}
const cnt = (n, mul) => Math.max(1, Math.min(n, Math.round(n * mul)));
function instanced(e, geo, mat, n) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.boundingSphere = new THREE.Sphere(e.c.clone(), e.bound);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _eul = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _col = new THREE.Color();
function setInst(mesh, i, x, y, z, rx, ry, rz, sx, sy = sx, sz = sx, order = 'XYZ') {
  _eul.set(rx, ry, rz, order);
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_eul), _s.set(sx, sy, sz));
  mesh.setMatrixAt(i, _m);
}
function ramp(out, stops, u) {
  const n = stops.length - 1;
  const k = Math.min(n - 1e-6, Math.max(0, u * n));
  const i = Math.floor(k);
  return out.copy(stops[i]).lerp(stops[i + 1], k - i);
}

// 火舌（Fire／Demonic／Eclipse 煙共用）：由腳底一圈升上去、收窄、變細
function flameParticle(e, cl, i, t, { speed = 0.9, spread = 1, rise = 0.8, big = 0.85, stops = null }) {
  const S = cl.seeds;
  const a = S[i * 4];
  const b = S[i * 4 + 1];
  const p = S[i * 4 + 2];
  const sp = 0.75 + S[i * 4 + 3] * 0.5;
  const u = fract(t * speed * sp + p);
  const ang = a * TAU + Math.sin(t * 1.3 + p * 6) * 0.25;
  const rr = e.R * (0.55 + 0.45 * b) * (1 - 0.5 * u) * spread;
  const wob = Math.sin(t * 7 + p * 20) * 0.06 * e.s * u;
  cl.pos[i * 3] = e.c.x + Math.cos(ang) * rr + wob;
  const sz = e.s * (big * Math.pow(1 - u, 0.7) + 0.1) * (0.9 + 0.2 * Math.sin(t * 13 + p * 30));
  cl.size[i] = sz;
  cl.pos[i * 3 + 1] = e.minY + sz * 0.3 + u * e.H * rise; // 火舌底喺地面（唔好穿落地下）
  cl.pos[i * 3 + 2] = e.c.z + Math.sin(ang) * rr;

  cl.alpha[i] = smooth(0, 0.1, u) * Math.pow(1 - u, 1.1);
  if (stops) {
    ramp(_col, stops, u);
    cl.col[i * 3] = _col.r;
    cl.col[i * 3 + 1] = _col.g;
    cl.col[i * 3 + 2] = _col.b;
  }
}
// 火星：螺旋飄高，一閃一閃
function emberParticle(e, cl, i, t, { speed = 0.4, rise = 1.5, size = 0.1 } = {}) {
  const S = cl.seeds;
  const p = S[i * 4 + 2];
  const sp = 0.75 + S[i * 4 + 1] * 0.5;
  const u = fract(t * speed * sp + p);
  const ang = S[i * 4] * TAU + u * 3 + t * 0.4;
  const rr = e.R * (1 - 0.5 * u);
  cl.pos[i * 3] = e.c.x + Math.cos(ang) * rr;
  cl.pos[i * 3 + 1] = e.minY + u * e.H * rise;
  cl.pos[i * 3 + 2] = e.c.z + Math.sin(ang) * rr;
  cl.size[i] = size * e.s * (0.7 + 0.6 * Math.abs(Math.sin(t * 9 + p * 40)));
  cl.alpha[i] = Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(t * 15 + p * 50));
}

// 由鏡頭望過去、寵物「後面」嘅方向（寵物自己座標、打橫）；未畫過就當 +z
const _inv = new THREE.Matrix4();
const _dir = new THREE.Vector3();
function awayDir(e) {
  if (e.camX === undefined) return _dir.set(0, 0, 1);
  _inv.copy(e.g.matrixWorld).invert();
  _dir.set(e.camX, e.camY, e.camZ).applyMatrix4(_inv).sub(e.c);
  _dir.y = 0;
  if (_dir.lengthSq() < 1e-10) return _dir.set(0, 0, 1);
  return _dir.normalize().negate();
}

// ---------- 每種變異 ----------
const FIRE_STOPS = [lin(0xfff176), lin(0xffa000), lin(0xff5722), lin(0xb71c1c)].map((c) => c.multiplyScalar(1.6)); // 火舌用普通混色（日頭都見到），光啲先夠
const DEMON_STOPS = [lin(0xffab40), lin(0xff1744), lin(0xb71c1c), lin(0x4a0000)].map((c) => c.multiplyScalar(1.5));
const DARK_STOPS = [lin(0x2a0000), lin(0x120000), lin(0x050000)];
const ECLIPSE_SMOKE = [lin(0x4a148c), lin(0x2a0845), lin(0x12001f)];
const pal = (...hex) => hex.map(lin);

const BUILD = {
  fire(e) {
    const fl = cloud(e, 36, 'flame', false);
    const em = cloud(e, 20, 'glow', true, { colors: pal(0xffab40, 0xffd740, 0xff6d00) });
    const glow = new THREE.Mesh(unitPlane, MAT.fireGlow);
    glow.position.set(e.c.x, e.minY + (0.02 + e.layer * 0.008) * e.s, e.c.z);
    glow.renderOrder = 1;
    e.g.add(glow, fl.pts, em.pts);
    return {
      anchor: fl.pts,
      update(t, mul) {
        const n = cnt(36, mul);
        for (let i = 0; i < n; i++) flameParticle(e, fl, i, t, { stops: FIRE_STOPS, big: 1.1, rise: 0.95 });
        flush(fl, n, true);
        const m = cnt(20, mul);
        for (let i = 0; i < m; i++) emberParticle(e, em, i, t);
        flush(em, m);
        glow.scale.setScalar(e.R * 2.9 * (1 + 0.06 * Math.sin(t * 9 + e.seed * 9)));
      },
    };
  },

  eclipse(e) {
    const D = Math.max(0.9 * e.s, e.R * 1.25);
    const sunPos = V(e.c.x, e.maxY + D * 0.3, e.c.z + e.depth * 0.25);
    const sun = new THREE.Sprite(MAT.sun);
    sun.position.copy(sunPos);
    sun.scale.setScalar(D);
    sun.renderOrder = 1;
    const rays = new THREE.Sprite(MAT.rays);
    rays.position.copy(sunPos);
    rays.renderOrder = 2;
    const rings = instanced(e, ringGeo, MAT.eclipseRing, 2);
    rings.renderOrder = 3;
    const smoke = cloud(e, 20, 'smoke', false);
    const sparks = cloud(e, 18, 'glow', true, { colors: pal(0xffffff, 0xea80fc, 0xb388ff) });
    const reach = e.bound + D;
    smoke.geo.boundingSphere.radius = sparks.geo.boundingSphere.radius = reach;
    e.g.add(sun, rays, rings, smoke.pts, sparks.pts);
    return {
      anchor: smoke.pts,
      secondary: [rays],
      update(t, mul) {
        // 黑太陽：喺寵物後面上面（以鏡頭計），所以永遠喺佢背後
        awayDir(e);
        sunPos.set(e.c.x + _dir.x * e.R * 0.9, e.maxY + D * 0.25, e.c.z + _dir.z * e.R * 0.9);
        sun.position.copy(sunPos);
        rays.position.copy(sunPos);
        const pulse = 1 + 0.07 * Math.sin(t * 3 + e.seed * 5);
        rays.scale.setScalar(D * 2.3 * (1 + 0.08 * Math.sin(t * 2.2 + e.seed * 3)));
        sun.scale.setScalar(D * (1 + 0.03 * Math.sin(t * 4)));
        setInst(rings, 0, e.c.x, e.c.y, e.c.z, Math.PI / 2, 0, t * 1.4, e.R * 1.08 * pulse);
        setInst(rings, 1, e.c.x, e.c.y + e.H * 0.12, e.c.z, Math.PI / 2 + 0.55, 0.3, -t * 1.9, e.R * 0.95 * (2 - pulse));
        rings.instanceMatrix.needsUpdate = true;
        const n = cnt(20, mul);
        for (let i = 0; i < n; i++) {
          flameParticle(e, smoke, i, t, { speed: 0.45, rise: 1.0, big: 1.0, stops: ECLIPSE_SMOKE });
          smoke.alpha[i] *= 0.85;
        }
        flush(smoke, n, true);
        // 光點由身邊螺旋吸入黑太陽
        const m = cnt(18, mul);
        const S = sparks.seeds;
        for (let i = 0; i < m; i++) {
          const u = fract(t * (0.35 + S[i * 4 + 1] * 0.25) + S[i * 4 + 2]);
          const k = u * u;
          const a = S[i * 4] * TAU + u * 2.5;
          const r0 = e.R * 1.45 * (1 - k);
          const y0 = e.minY + S[i * 4 + 3] * e.H;
          sparks.pos[i * 3] = e.c.x + Math.cos(a) * r0 + (sunPos.x - e.c.x) * k;
          sparks.pos[i * 3 + 1] = y0 + (sunPos.y - y0) * k;
          sparks.pos[i * 3 + 2] = e.c.z + Math.sin(a) * r0 + (sunPos.z - e.c.z) * k;
          sparks.size[i] = e.s * 0.12 * (1 - 0.5 * k);
          sparks.alpha[i] = Math.sin(Math.PI * u);
        }
        flush(sparks, m);
      },
    };
  },

  spectral(e) {
    const ghostGeo = ghostGeometry(e.model);
    let echoes = null;
    if (ghostGeo) {
      echoes = instanced(e, ghostGeo, MAT.ghost, 3);
      echoes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(9), 3).setUsage(THREE.DynamicDrawUsage);
      echoes.renderOrder = 2;
      echoes.boundingSphere.radius = e.bound + e.depth;
      e.g.add(echoes);
    }
    const wisps = cloud(e, 24, 'glow', false, { colors: pal(0x00e5ff, 0x84ffff, 0x18ffff, 0xe0ffff).map((c) => c.multiplyScalar(1.3)) });
    e.g.add(wisps.pts);
    const tint = lin(0x4dd0e1);
    return {
      anchor: wisps.pts,
      secondary: echoes ? [echoes] : [],
      update(t, mul) {
        if (echoes && echoes.visible) {
          const n = quality === 0 ? 1 : 3;
          echoes.count = n;
          for (let k = 0; k < n; k++) {
            // 分身：由身體慢慢飄去後面、飄高少少、變大少少、淡出
            const u = fract(t * 0.5 + k / 3 + e.seed);
            const sc = 1 + 0.14 * u;
            const side = Math.sin(t * 1.7 + k * 2.1) * 0.12 * e.s;
            const ox = e.c.x + side;
            const oy = e.c.y + u * e.H * 0.25;
            const oz = e.c.z + u * e.depth * 0.75;
            // 以身體中心放大：T(o) S T(-c)
            _m.makeScale(sc, sc, sc);
            _m.setPosition(ox - e.c.x * sc, oy - e.c.y * sc, oz - e.c.z * sc);
            echoes.setMatrixAt(k, _m);
            const k2 = smooth(0, 0.12, u) * Math.pow(1 - u, 1.5) * 0.55;
            echoes.instanceColor.setXYZ(k, tint.r * k2, tint.g * k2, tint.b * k2);
          }
          echoes.instanceMatrix.needsUpdate = true;
          echoes.instanceColor.needsUpdate = true;
        }
        const n = cnt(24, mul);
        const S = wisps.seeds;
        for (let i = 0; i < n; i++) {
          const dir = S[i * 4 + 3] > 0.5 ? 1 : -1;
          const u = fract(t * 0.16 * (0.7 + S[i * 4 + 1] * 0.6) + S[i * 4 + 2]);
          const ang = S[i * 4] * TAU + t * (0.6 + 0.5 * S[i * 4 + 1]) * dir;
          const rr = e.R * (0.85 + 0.3 * Math.sin(t * 1.1 + S[i * 4 + 2] * 9));
          wisps.pos[i * 3] = e.c.x + Math.cos(ang) * rr;
          wisps.pos[i * 3 + 1] = e.minY + u * e.H * 1.35;
          wisps.pos[i * 3 + 2] = e.c.z + Math.sin(ang) * rr;
          wisps.size[i] = e.s * (0.16 + 0.1 * Math.sin(t * 3 + i));
          wisps.alpha[i] = Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(t * 5 + i * 1.7));
        }
        flush(wisps, n);
      },
    };
  },

  phantom(e) {
    const smoke = cloud(e, 26, 'smoke', false, { colors: pal(0x1a0026, 0x311b92, 0x4a148c, 0x6a1b9a) });
    const sparks = cloud(e, 15, 'glow', true, { colors: pal(0xb388ff, 0xe1bee7, 0x7c4dff) });
    sparks.col.set([0.7, 0.5, 1], 0);
    const ring = new THREE.Mesh(ringGeo, MAT.phantomRing.clone()); // 自己一份：每隻寵物閃嘅時間唔同
    e.own.push(ring.material);
    ring.visible = false;
    ring.renderOrder = 3;
    e.g.add(smoke.pts, sparks.pts, ring);
    const period = 4.5 + e.seed * 3;
    return {
      anchor: smoke.pts,
      update(t, mul) {
        const n = cnt(26, mul);
        const S = smoke.seeds;
        for (let i = 0; i < n; i++) {
          // 紫煙：螺旋升上去，越升越大越淡
          const u = fract(t * 0.32 * (0.8 + S[i * 4 + 1] * 0.4) + S[i * 4 + 2]);
          const ang = S[i * 4] * TAU + u * 4 + t * 0.8;
          const rr = e.R * (0.65 + 0.5 * u);
          smoke.pos[i * 3] = e.c.x + Math.cos(ang) * rr;
          smoke.pos[i * 3 + 1] = e.minY + u * e.H * 1.35;
          smoke.pos[i * 3 + 2] = e.c.z + Math.sin(ang) * rr;
          smoke.size[i] = e.s * (0.4 + 0.9 * u);
          smoke.alpha[i] = Math.sin(Math.PI * u) * 0.7;
        }
        flush(smoke, n);
        // 瞬間移動：每 period 秒一次
        const ph = fract(t / period + e.seed);
        const blink = ph * period; // 呢次閃咗幾耐（秒）
        const m = cnt(14, mul);
        const P = sparks.seeds;
        for (let i = 1; i <= m; i++) {
          const ang = P[i * 4] * TAU + t * (2 + P[i * 4 + 1] * 2);
          const rr = e.R * (0.6 + 0.35 * P[i * 4 + 2]);
          sparks.pos[i * 3] = e.c.x + Math.cos(ang) * rr;
          sparks.pos[i * 3 + 1] = e.minY + e.H * (0.15 + 0.8 * fract(P[i * 4 + 3] + t * 0.2));
          sparks.pos[i * 3 + 2] = e.c.z + Math.sin(ang) * rr;
          sparks.size[i] = e.s * 0.1;
          sparks.alpha[i] = 0.5 + 0.5 * Math.sin(t * 8 + i);
        }
        // 第 0 粒 = 瞬移閃光
        const flashK = blink < 0.45 ? 1 - blink / 0.45 : 0;
        sparks.pos[0] = e.c.x;
        sparks.pos[1] = e.c.y;
        sparks.pos[2] = e.c.z;
        sparks.size[0] = e.s * (1 + 2.2 * (1 - flashK)) * 1.2;
        sparks.alpha[0] = flashK * 0.9;
        flush(sparks, m + 1);
        // 紫色光圈由腳掃到頭
        ring.visible = blink < 0.5;
        if (ring.visible) {
          const k = blink / 0.5;
          ring.position.set(e.c.x, e.minY + k * e.H * 1.05, e.c.z);
          ring.rotation.set(Math.PI / 2, 0, t * 6);
          ring.scale.setScalar(e.R * (1.15 - 0.3 * k));
          ring.material.opacity = 1 - k * 0.7;
        }
        // 寵物消失一下下（0.05–0.17 秒）
        setHidden(e, blink > 0.05 && blink < 0.17);
      },
    };
  },

  meteoric(e) {
    const rocks = instanced(e, rockGeo, MAT.rock, 4);
    const crystals = instanced(e, crystalGeo, MAT.crystal, 6);
    const pts = cloud(e, 4 * 7 + 14, 'glow', true);
    // 尾巴顏色：頭白藍、尾深藍；火花：光青色
    const head = lin(0xb3e5fc);
    const tail = lin(0x2962ff);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++) {
      _col.copy(head).lerp(tail, j / 6);
      pts.col.set([_col.r, _col.g, _col.b], (k * 7 + j) * 3);
    }
    for (let i = 28; i < pts.n; i++) pts.col.set([0.55, 0.9, 1], i * 3);
    const incl = [0.35, -0.55, 0.85, -0.2];
    const crystalAt = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * TAU + Math.random() * 0.5, sz: 0.2 + Math.random() * 0.14, tilt: 0.25 + Math.random() * 0.3 }));
    e.g.add(rocks, crystals, pts.pts);
    const orbit = (k, time, out) => {
      const a = time * 1.5 * (1 + 0.15 * k) + (k * Math.PI) / 2;
      const r = e.R * 1.15;
      const x = Math.cos(a) * r;
      const z0 = Math.sin(a) * r;
      const inc = incl[k];
      out.set(e.c.x + x, e.c.y + z0 * Math.sin(inc) * 0.6, e.c.z + z0 * Math.cos(inc));
      return out;
    };
    return {
      anchor: pts.pts,
      secondary: [crystals],
      update(t, mul) {
        const nRocks = mul < 0.3 ? 2 : 4;
        rocks.count = nRocks;
        for (let k = 0; k < nRocks; k++) {
          orbit(k, t, _p);
          setInst(rocks, k, _p.x, _p.y, _p.z, t * 2 + k, t * 3, 0, e.s * 0.15);
          // 尾巴：之前嘅位置
          for (let j = 0; j < 7; j++) {
            orbit(k, t - j * 0.045, _p);
            const i = k * 7 + j;
            pts.pos.set([_p.x, _p.y, _p.z], i * 3);
            pts.size[i] = e.s * (0.32 - j * 0.035);
            pts.alpha[i] = 1 - j / 7;
          }
        }
        for (let i = nRocks * 7; i < 28; i++) pts.alpha[i] = 0;
        rocks.instanceMatrix.needsUpdate = true;
        // 電火花：身邊隨機位置一閃即逝
        const m = cnt(14, mul);
        const S = pts.seeds;
        for (let j = 0; j < m; j++) {
          const i = 28 + j;
          const tick = Math.floor(t * 7 + S[i * 4] * 10);
          const h1 = fract(Math.sin(tick * 12.9898 + i * 78.233) * 43758.5);
          const h2 = fract(Math.sin(tick * 39.346 + i * 11.135) * 43758.5);
          const h3 = fract(Math.sin(tick * 73.156 + i * 5.789) * 43758.5);
          const a = h1 * TAU;
          pts.pos.set([e.c.x + Math.cos(a) * e.R * (0.7 + 0.3 * h3), e.minY + h2 * e.H * 1.05, e.c.z + Math.sin(a) * e.R * (0.7 + 0.3 * h3)], i * 3);
          pts.size[i] = e.s * 0.13;
          pts.alpha[i] = Math.pow(1 - fract(t * 7 + S[i * 4] * 10), 2);
        }
        flush(pts, 28 + m);
        if (crystals.visible) {
          crystalAt.forEach(({ a, sz, tilt }, i) => {
            const r = e.R * 0.95;
            setInst(crystals, i, e.c.x + Math.cos(a) * r, e.minY + (0.02 + Math.sin(t * 2 + i) * 0.05) * e.s, e.c.z + Math.sin(a) * r, Math.sin(a) * tilt, t * 0.6 + i, -Math.cos(a) * tilt, e.s * sz * 1.6, e.s * sz * 1.6, e.s * sz * 1.6, 'XYZ');
          });
          crystals.instanceMatrix.needsUpdate = true;
        }
      },
    };
  },

  astral(e) {
    // 星環喺一個斜咗嘅 group 入面成個轉（唔使逐粒計位置）
    const tiltG = new THREE.Group();
    tiltG.position.copy(e.c);
    tiltG.rotation.set(0.42 + e.layer * 0.25, 0, 0.28);
    const spin = new THREE.Group();
    tiltG.add(spin);
    const N = 44;
    const stars = cloud(e, N, 'star', true, { colors: pal(0xffffff, 0xf8bbd0, 0xd1c4e9, 0x80d8ff, 0xea80fc), center: V(0, 0, 0), radius: e.bound });
    const angles = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + (stars.seeds[i * 4] - 0.5) * 0.12;
      const r = e.R * (1.12 + 0.28 * stars.seeds[i * 4 + 1]);
      angles.push(a);
      stars.pos.set([Math.cos(a) * r, (stars.seeds[i * 4 + 2] - 0.5) * e.H * 0.14, Math.sin(a) * r], i * 3);
      stars.size[i] = e.s * (0.14 + 0.26 * Math.pow(stars.seeds[i * 4 + 3], 2));
    }
    stars.geo.attributes.position.needsUpdate = true;
    stars.geo.attributes.aSize.needsUpdate = true;
    // 星座：幾組 3–4 粒相鄰嘅星連埋
    const seg = [];
    for (let start = 0; start < N - 4; start += 9) for (let j = start; j < start + 3; j++) seg.push(...stars.pos.slice(j * 3, j * 3 + 3), ...stars.pos.slice((j + 1) * 3, (j + 1) * 3 + 3));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    lg.boundingSphere = new THREE.Sphere(V(0, 0, 0), e.bound);
    e.own.push(lg);
    const lines = new THREE.LineSegments(lg, MAT.starLines);
    lines.renderOrder = 2;
    spin.add(stars.pts, lines);
    const neb = new THREE.Sprite(MAT.nebula);
    neb.renderOrder = 1;
    e.g.add(neb, tiltG);
    return {
      anchor: stars.pts,
      secondary: [lines, neb],
      update(t, mul) {
        spin.rotation.y = t * 0.35 * (e.layer % 2 ? -1 : 1);
        const n = cnt(N, mul);
        const S = stars.seeds;
        for (let i = 0; i < n; i++) stars.alpha[i] = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.2 + 3 * S[i * 4 + 1]) + S[i * 4 + 2] * 20));
        stars.geo.setDrawRange(0, n);
        stars.geo.attributes.aAlpha.needsUpdate = true;
        awayDir(e); // 星雲放喺寵物後面（以鏡頭計）
        neb.position.set(e.c.x + _dir.x * e.R * 0.8, e.c.y + e.H * 0.1, e.c.z + _dir.z * e.R * 0.8);
        neb.scale.setScalar(e.R * 2.8 * (1 + 0.06 * Math.sin(t * 1.3 + e.seed * 4)));
      },
    };
  },

  demonic(e) {
    const dark = cloud(e, 18, 'flame', false);
    const red = cloud(e, 32, 'flame', false);
    red.pts.renderOrder = 3; // 紅火畫喺黑火前面
    for (let i = 22; i < 32; i++) red.col.set([1, 0.25, 0.1], i * 3);
    const horns = instanced(e, hornGeo, MAT.horn, 2);
    horns.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(6).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
    const wings = instanced(e, wingGeo, MAT.wing, 2);
    const runes = new THREE.Mesh(unitPlane, MAT.runes);
    runes.position.set(e.c.x, e.minY + (0.03 + e.layer * 0.008) * e.s, e.c.z);
    runes.renderOrder = 1;
    e.g.add(runes, dark.pts, red.pts, horns, wings);
    const hx = e.width * 0.17;
    const hornS = e.s * 0.6;
    const wingS = e.s;
    return {
      anchor: red.pts,
      secondary: [wings],
      update(t, mul) {
        const n = cnt(18, mul);
        for (let i = 0; i < n; i++) flameParticle(e, dark, i, t, { speed: 0.8, big: 0.95, stops: DARK_STOPS });
        flush(dark, n, true);
        const m = cnt(22, mul);
        for (let i = 0; i < m; i++) flameParticle(e, red, i, t, { speed: 1.05, spread: 0.92, big: 0.75, stops: DEMON_STOPS });
        const k = cnt(10, mul);
        for (let j = 0; j < k; j++) emberParticle(e, red, m + j, t, { speed: 0.45, size: 0.09 });
        flush(red, m + k, true);
        // 角：上下郁少少，一閃一閃
        const glow = 0.85 + 0.35 * Math.abs(Math.sin(t * 2.2 + e.seed * 6));
        for (const [i, side] of [[0, -1], [1, 1]]) {
          setInst(horns, i, e.c.x + side * hx, e.maxY - 0.04 * e.s + Math.sin(t * 2.4 + i) * 0.03 * e.s, e.c.z - e.depth * 0.18, 0, 0, side * -0.25, side * hornS, hornS, hornS);
          horns.instanceColor.setXYZ(i, glow, glow, glow);
        }
        horns.instanceMatrix.needsUpdate = true;
        horns.instanceColor.needsUpdate = true;
        // 蝙蝠翼：喺背脊（身體頂、偏後），快快拍
        if (wings.visible) {
          const flap = 0.4 + 0.45 * Math.sin(t * 10 + e.seed * 7); // 翼向後拍拍下
          for (const [i, side] of [[0, -1], [1, 1]]) setInst(wings, i, e.c.x + side * e.width * 0.1, e.maxY - e.H * 0.3, e.c.z + e.depth * 0.15, 0, -side * flap, side * 0.35, side * wingS, wingS, wingS, 'XYZ');
          wings.instanceMatrix.needsUpdate = true;
        }
        runes.scale.setScalar(e.R * 2.5);
        runes.rotation.y = t * 0.4;
      },
    };
  },
};

// 👻 Spectral 分身用：成隻寵物焊做一個形狀（只要位置），同一款動物共用
const ghostCache = new Map();
function ghostGeometry(model) {
  const parts = [];
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  let verts = 0;
  model.traverse((o) => {
    if (o.userData.isMutationAura) return;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry?.attributes.position) return;
    let hidden = false;
    for (let p = o; p && p !== model; p = p.parent) if (p.userData.isMutationAura || p.visible === false) hidden = true;
    if (hidden) return;
    parts.push(o);
    verts += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
  });
  if (!parts.length || parts.length > 400) return null;
  const key = `${model.userData.animalName || model.children[0]?.userData.animalName || '?'}|${parts.length}|${verts}|${new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).multiplyScalar(100).round().toArray().join(',')}|${model.scale.x.toFixed(3)}`;
  if (ghostCache.has(key)) return ghostCache.get(key);
  // 每件零件用佢個框（方塊）代替：Blocky 風格睇落差唔多，但點數少好多（熊貓 67000 → 1400）
  const geos = parts.map((o) => {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const sz = bb.getSize(V(0, 0, 0));
    const ctr = bb.getCenter(V(0, 0, 0));
    const g = new THREE.BoxGeometry(Math.max(sz.x, 1e-3), Math.max(sz.y, 1e-3), Math.max(sz.z, 1e-3)).translate(ctr.x, ctr.y, ctr.z);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (ghostCache.size > 80) ghostCache.clear(); // 太多就清（用緊嘅會照用返自己嗰份）
  ghostCache.set(key, merged);
  return merged;
}

// 🟣 Phantom 瞬移：收埋寵物本身（唔收特效）
function setHidden(e, hide) {
  if (!!e.hidden === hide) return;
  e.hidden = hide;
  for (const ch of e.model.children) {
    if (ch.userData.isMutationAura) continue;
    if (hide) {
      ch.userData.phantomWasVisible = ch.visible;
      ch.visible = false;
    } else if (ch.userData.phantomWasVisible !== undefined) {
      ch.visible = ch.userData.phantomWasVisible;
      delete ch.userData.phantomWasVisible;
    }
  }
}

// ---------- 加特效 ----------
const all = new Set(); // 全部（清理用）
let seen = new Set(); // 上一格有畫到嘅
let nextId = 1;
const _cam = new THREE.Vector3();

export function addFireAura(model, kind = 'fire') {
  if (kind && kind.includes('+')) return kind.split('+').forEach((k) => addFireAura(model, k)); // 疊咗幾種變異：每種一層
  if (!BUILD[kind]) return;
  model.userData.fireAuras ??= {};
  if (model.userData.fireAuras[kind]) return;
  if (model.userData.noFireAura || model.userData.inner?.userData.noFireAura) return; // Royal Skywhale：小朋友唔要佢身邊有圈火
  // 量大細時唔計之前嘅特效（每層都用返寵物本身嘅大細，唔會一層大過一層）
  const prev = Object.values(model.userData.fireAuras);
  prev.forEach((g) => model.remove(g));
  model.updateMatrixWorld(true);
  const world = new THREE.Box3().setFromObject(model);
  prev.forEach((g) => model.add(g));
  if (world.isEmpty()) return;
  // 轉做 model 自己嘅座標（之後放大縮細、搬位都跟住）
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(model.worldToLocal(V(i & 1 ? world.max.x : world.min.x, i & 2 ? world.max.y : world.min.y, i & 4 ? world.max.z : world.min.z)));
  const box = new THREE.Box3().setFromPoints(corners);
  const size = box.getSize(V(0, 0, 0));
  const c = box.getCenter(V(0, 0, 0));
  const layer = prev.length;
  const s = Math.max(0.01, Math.max(size.x, size.y, size.z) / 2); // 全部特效大細跟寵物自己（細隻寵物、手上嘅寵物都啱）
  const R = (Math.max(size.x, size.z) * 0.55 + 0.1 * s) * (1 + 0.1 * layer); // 第二、三層大少少，唔會撞埋一齊
  const g = new THREE.Group();
  g.userData.isMutationAura = true;
  const e = {
    id: nextId++, kind, model, g, c, R, s, layer, seed: Math.random(),
    H: Math.max(0.2 * s, size.y), minY: box.min.y, maxY: box.max.y, width: size.x, depth: size.z,
    bound: Math.max(R * 1.7, size.y * 1.6) + s, own: [], lod: 0,
  };
  const fx = BUILD[kind](e);
  Object.assign(e, fx);
  e.secondary ??= [];
  g.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  // 有畫到先郁：記低邊個鏡頭睇緊（用嚟計遠近）、畫面幾高（粒子大細）
  fx.anchor.onBeforeRender = (renderer, scene, camera) => {
    const rt = renderer.getRenderTarget();
    halfH.value = (rt ? rt.height : renderer.getDrawingBufferSize(_tmp2).y) / 2;
    e.camX = camera.matrixWorld.elements[12];
    e.camY = camera.matrixWorld.elements[13];
    e.camZ = camera.matrixWorld.elements[14];
    seen.add(e);
  };
  model.add(g);
  model.userData.fireAura = g;
  model.userData.fireAuras[kind] = g;
  model.userData.auraLayers = (model.userData.auraLayers || 0) + 1;
  fx.update(0, 1, 0); // 第一格已經有嘢睇
  all.add(e);
}
const _tmp2 = new THREE.Vector2();

// 寵物仲喺唔喺場景
const onStage = (o) => {
  while (o.parent) o = o.parent;
  return o.isScene;
};

let frame = 0;
let lastCount = 0;
export function animateFireAuras(time) {
  frame++;
  const list = seen;
  seen = new Set();
  // 太多隻同時喺畫面：每隻都減少粒子
  const budget = Math.min(1, 40 / Math.max(1, lastCount));
  lastCount = list.size;
  const qMul = QUALITY_MUL[quality];
  for (const e of list) {
    if (!e.g.parent) continue;
    _cam.set(e.camX, e.camY, e.camZ);
    _p.copy(e.c).applyMatrix4(e.g.matrixWorld);
    const ws = _s.setFromMatrixColumn(e.g.matrixWorld, 0).length();
    const eff = _cam.distanceTo(_p) / (1 + e.R * ws * 0.25);
    const lod = eff < 24 ? 0 : eff < 60 ? 1 : 2;
    if (lod !== e.lod || quality !== e.q) {
      e.lod = lod;
      e.q = quality;
      const show = lod < 2 && quality > 0;
      for (const o of e.secondary) o.visible = show;
    }
    if (lod === 2 && (frame + e.id) % 3) continue; // 好遠：每 3 格先郁一次
    const stack = 1 / (1 + 0.35 * ((e.model.userData.auraLayers || 1) - 1));
    e.update(time, qMul * [1, 0.6, 0.25][lod] * stack * budget, lod);
  }
  // 共用物料嘅閃動（每格一次）
  MAT.fireGlow.opacity = 0.38 + 0.14 * Math.sin(time * 7) + 0.06 * Math.sin(time * 17);
  MAT.rays.rotation = time * 0.25;
  MAT.nebula.rotation = -time * 0.08;
  MAT.starLines.opacity = 0.3 + 0.25 * Math.abs(Math.sin(time * 0.9));
  MAT.runes.opacity = 0.45 + 0.25 * Math.abs(Math.sin(time * 2.2));
  MAT.ghost.opacity = 0.8 + 0.2 * Math.sin(time * 9);
  // 每 ~5 秒清理：離開咗場景超過 60 秒嘅放返 GPU 記憶（再出返嚟 three.js 會自動重新上載）
  if (frame % 300 === 0) for (const e of all) {
    if (onStage(e.g)) {
      e.offSince = null;
      continue;
    }
    e.offSince ??= time;
    if (time - e.offSince > 60) {
      setHidden(e, false);
      e.own.forEach((o) => o.dispose());
      all.delete(e);
    }
  }
}
