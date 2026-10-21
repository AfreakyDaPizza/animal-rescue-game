// 秘密沙灘（小朋友 Issue #2 最後一樣）：打贏 Mutated Scientist Poacher 之後先開
// Issue #9 重新設計（小朋友：「Redesign the beach to make it more cooler」）：
//   沙有紋理、岸邊濕沙；海浪一下一下湧上嚟、白泡 + 夜光藍綠色浮游生物；月光喺海面閃
//   棕櫚樹會擺、木碼頭（行得出去）、燈塔轉光、石頭同潮池、海龜 BB 孵出嚟爬落海、蟹仔橫行、螢火蟲
//   天上有銀河 + 北極光 + 大月亮、更多流星；篝火有火星、木頭凳、火把
// 長櫈可以坐低睇流星；遠處有個神秘 Ranger → 秘密結局「THE COLLAB」
// 效能：唔郁嘅裝飾（樹、石、碼頭、燈塔身）全部放入 deco 再用 bakeStatic 焊埋；重複嘅嘢（棕櫚樹、海龜、蟹）用 InstancedMesh

import * as THREE from 'three';
import { short } from './format.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEACH_LOCAL as BEACH, BENCH_LOCAL as BENCH, STRANGER_LOCAL as STRANGER, BEACH_PORTAL_LOCAL as PORTAL, BEACH_PIER_LOCAL as PIER, BEACH_OFFSET as OFF } from './labShape.js';
import { addCollider as addWorldCollider, addPlatform, bakeStatic } from './world.js';
// 沙灘用本地座標起，成舊搬去 x + OFF；撞嘢圈要用世界座標
const addCollider = (x, z, r) => addWorldCollider(x + OFF, z, r);
import { makeSign, makeLabel, THEMES } from './signs.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';

const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }));
  return materials.get(key);
};
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

export const beach = { open: false, gate: null, stranger: null, sky: 0, stars: null };

// ---------- 海岸線（JS 同 shader 用同一條公式）----------
// 沙灘範圍入面海岸係直線（x ≈ maxX + 0.5）；南北兩頭向海伸出去變海角，好似一個小海灣
const CZ = (BEACH.minZ + BEACH.maxZ) / 2;
const SHORE = BEACH.maxX + 0.5;
const shoreX = (z) => {
  const e = Math.max(Math.abs(z - CZ) - 20, 0);
  return SHORE + e * e * 0.08;
};
// 沙嘅高度：陸地 = 0，過咗岸邊慢慢斜落海
function seabed(x, z) {
  const d = x - shoreX(z);
  if (d < -1) return 0;
  if (d < 7) return -(d + 1) * 0.04;
  return Math.max(-5, -0.32 - (d - 7) * 0.14);
}
const SHORE_GLSL = /* glsl */ `
  float shoreX(float z) { float e = max(abs(z - ${CZ.toFixed(2)}) - 20.0, 0.0); return ${SHORE.toFixed(2)} + e * e * 0.08; }
  float seabed(float x, float z) {
    float d = x - shoreX(z);
    if (d < -1.0) return 0.0;
    if (d < 7.0) return -(d + 1.0) * 0.04;
    return max(-5.0, -0.32 - (d - 7.0) * 0.14);
  }
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
  }
`;

// 發光圓點（流星、螢火蟲、火星、月光暈共用）
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// 沙嘅紋理：一粒粒沙 + 風吹出嚟嘅波紋
function sandTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ead5a4';
  ctx.fillRect(0, 0, 256, 256);
  const r = seeded(77);
  for (let y = 0; y < 256; y += 3) {
    // 波紋（淡淡哋）
    ctx.strokeStyle = `rgba(${y % 2 ? '255,248,225' : '170,135,80'},0.07)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, y + Math.sin((x / 256) * Math.PI * 4 + y * 0.3) * 3);
    ctx.stroke();
  }
  const cols = ['#f8e9c6', '#dcc391', '#c9ab74', '#fff6dc', '#b8955e', '#e3cc9c'];
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = cols[Math.floor(r() * cols.length)];
    const s = r() < 0.9 ? 1 : 2;
    ctx.fillRect(Math.floor(r() * 256), Math.floor(r() * 256), s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 36);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 森林樹（松樹或者大圓樹，唔撞得）
function forestTree(root, x, z, s, kind) {
  const trunk = mat(0x5d4037);
  add(root, new THREE.BoxGeometry(0.6 * s, 4 * s, 0.6 * s), trunk, x, 2 * s, z);
  if (kind < 0.5) {
    [[3, 1.4, 3.6], [2.3, 1.2, 4.8], [1.4, 1.1, 5.9]].forEach(([w, h, y], i) => add(root, new THREE.BoxGeometry(w * s, h * s, w * s), mat(i % 2 ? 0x2e7d32 : 0x1b5e20), x, y * s, z).rotation.y = i * 0.4);
  } else {
    add(root, new THREE.BoxGeometry(3.4 * s, 2.4 * s, 3.4 * s), mat(0x388e3c), x, 4.6 * s, z);
    add(root, new THREE.BoxGeometry(2.4 * s, 1.6 * s, 2.4 * s), mat(0x43a047), x + 0.6 * s, 6 * s, z + 0.3 * s);
  }
}
// 巨型高樹（邊界）：好粗好高，樹冠好大
function giantTree(root, x, z, s) {
  add(root, new THREE.BoxGeometry(2.2 * s, 22 * s, 2.2 * s), mat(0x4e342e), x, 11 * s, z);
  for (const [dx, dz] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4]]) add(root, new THREE.BoxGeometry(1.2 * s, 2 * s, 1.2 * s), mat(0x3e2723), x + dx * s, 1 * s, z + dz * s); // 樹根
  add(root, new THREE.BoxGeometry(11 * s, 6 * s, 11 * s), mat(0x1b5e20), x, 23 * s, z);
  add(root, new THREE.BoxGeometry(8 * s, 4 * s, 8 * s), mat(0x2e7d32), x + 1.5 * s, 27.5 * s, z - 1 * s);
  add(root, new THREE.BoxGeometry(5 * s, 3 * s, 5 * s), mat(0x388e3c), x - 1.5 * s, 30 * s, z + 1.2 * s);
}

// 將幾舊 geometry 加顏色再合埋（InstancedMesh 用：一個 draw call 畫晒）
function colored(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// 棕櫚樹（一棵嘅形狀；樹幹彎彎、葉向下垂、有椰子）
const PALM_TOP = { x: 0.02 * 64, y: 8 * 0.72 };
function palmGeometry() {
  const parts = [];
  const seg = 0.72;
  const lean = (i) => 0.02 * i * i;
  for (let i = 0; i < 8; i++) {
    const tilt = Math.atan2(lean(i + 1) - lean(i), seg);
    const g = new THREE.CylinderGeometry(0.2 - i * 0.008, 0.25 - i * 0.008, seg + 0.08, 8);
    g.rotateZ(-tilt).translate((lean(i) + lean(i + 1)) / 2, i * seg + seg / 2, 0);
    parts.push(colored(g, i % 2 ? 0x8d6e63 : 0x6d4c41));
  }
  const { x: cx, y: cy } = PALM_TOP;
  const leaf = (len, up, droop, angle, color) => {
    const g = new THREE.PlaneGeometry(len, 0.95, 10, 2);
    g.translate(len / 2, 0, 0).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / len;
      const z = p.getZ(i) * (1 - 0.8 * u);
      p.setZ(i, z);
      p.setY(i, (up * u - droop * u * u) * len + Math.abs(z) * 0.4); // 拱起再垂低，中間有條摺
    }
    g.computeVertexNormals();
    g.rotateY(angle).translate(cx, cy, 0);
    parts.push(colored(g, color));
  };
  const greens = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20];
  for (let i = 0; i < 9; i++) leaf(3.3, 0.28, 0.62, (i / 9) * Math.PI * 2 + (i % 2) * 0.2, greens[i % 4]);
  for (let i = 0; i < 4; i++) leaf(1.9, 0.75, 0.55, (i / 4) * Math.PI * 2 + 0.6, 0x66bb6a); // 新葉向上
  parts.push(colored(new THREE.SphereGeometry(0.34, 8, 6).translate(cx, cy - 0.05, 0), 0x6d4c41));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    parts.push(colored(new THREE.SphereGeometry(0.17, 8, 6).translate(cx + Math.cos(a) * 0.3, cy - 0.3, Math.sin(a) * 0.3), 0x4e342e));
  }
  return mergeGeometries(parts);
}

// BB 海龜（面向 +x）
function turtleGeometry() {
  const parts = [];
  parts.push(colored(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.15, 0.55, 0.95), 0x3e5b2e)); // 殼
  parts.push(colored(new THREE.SphereGeometry(0.14, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.7, 0.9).translate(0, 0.02, 0), 0x6b8e3a)); // 殼花
  parts.push(colored(new THREE.SphereGeometry(0.075, 8, 6).translate(0.27, 0.05, 0), 0x556b2f)); // 頭
  for (const [x, z, w] of [[0.12, 0.2, 0.2], [0.12, -0.2, 0.2], [-0.15, 0.15, 0.12], [-0.15, -0.15, 0.12]]) {
    parts.push(colored(new THREE.BoxGeometry(w * 0.6, 0.03, w).rotateY(z > 0 ? -0.5 : 0.5).translate(x, 0.02, z), 0x33691e)); // 鰭
  }
  parts.push(colored(new THREE.SphereGeometry(0.018, 6, 4).translate(0.32, 0.08, 0.04), 0x111111));
  parts.push(colored(new THREE.SphereGeometry(0.018, 6, 4).translate(0.32, 0.08, -0.04), 0x111111));
  return mergeGeometries(parts);
}

// 蟹仔（打橫行，所以身長 z）
function crabGeometry() {
  const parts = [];
  parts.push(colored(new THREE.SphereGeometry(0.2, 10, 6).scale(0.8, 0.45, 1.1).translate(0, 0.12, 0), 0xff5722));
  for (const s of [-1, 1]) {
    parts.push(colored(new THREE.SphereGeometry(0.08, 8, 6).scale(1.2, 0.8, 1).translate(0.24, 0.12, s * 0.17), 0xff7043)); // 鉗
    parts.push(colored(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4).translate(0.12, 0.22, s * 0.06), 0xbf360c)); // 眼柄
    parts.push(colored(new THREE.SphereGeometry(0.03, 6, 4).translate(0.12, 0.29, s * 0.06), 0x111111));
    for (let i = 0; i < 3; i++) parts.push(colored(new THREE.BoxGeometry(0.03, 0.03, 0.2).rotateX(s * 0.6).translate(-0.06 + i * 0.07, 0.06, s * 0.24), 0xe64a19)); // 腳
  }
  return mergeGeometries(parts);
}

// 海星（5 隻角）
function starfishGeometry() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 ? 0.08 : 0.22;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

export function buildSecretBeach(scene) {
  const root = new THREE.Group(); // 會郁嘅嘢
  root.position.x = OFF;
  scene.add(root);
  const deco = new THREE.Group(); // 唔郁嘅裝飾 → 最後 bakeStatic 焊埋
  deco.position.x = OFF;
  const { minX, maxX, minZ, maxZ } = BEACH;
  const cz = CZ;
  const time = { value: 0 };
  const night = { value: 0 };

  // ================= 沙（有紋理；岸邊濕沙，向海慢慢斜落去） =================
  {
    const W = 130;
    const D = 124;
    const g = new THREE.PlaneGeometry(W, D, 130, 124).rotateX(-Math.PI / 2).translate(minX - 22 + W / 2, 0, cz);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const r = seeded(11);
    const dry = new THREE.Color(1, 1, 1);
    const wet = new THREE.Color(0.62, 0.58, 0.55);
    const under = new THREE.Color(0.42, 0.45, 0.5);
    const forest = new THREE.Color(0.3, 0.34, 0.2);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const d = x - shoreX(z);
      p.setY(i, seabed(x, z));
      c.copy(dry).lerp(wet, smooth(-4, -0.8, d)).lerp(under, smooth(0.5, 6, d));
      const outside = Math.max(minX - x, minZ - z, z - maxZ, 0); // 離開沙灘幾遠（森林地）
      c.lerp(forest, smooth(1.5, 6, outside) * smooth(-3, -9, d));
      const v = 0.95 + r() * 0.08;
      colors.set([c.r * v, c.g * v, c.b * v], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const sand = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sandTexture(), vertexColors: true, roughness: 0.95 }));
    sand.receiveShadow = true;
    root.add(sand);
  }

  // ================= 大海：shader 浪、湧上岸、白泡、夜光浮游生物、月光倒影 =================
  const MOON = new THREE.Vector3(maxX + 230, 78, cz - 45); // 本地座標
  const seaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uNight: { value: 0 }, uMoon: { value: new THREE.Vector3(MOON.x + OFF, MOON.y, MOON.z) } }]),
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vLocal; varying vec3 vWorld; varying vec3 vN;
      #include <fog_pars_vertex>
      ${SHORE_GLSL}
      float waveH(vec2 p, float t) {
        float d = p.x - shoreX(p.y);
        float far = smoothstep(1.5, 30.0, d);
        // 岸邊：水位慢慢一湧一退（浪打上沙灘）
        float lvl = -0.028 + 0.028 * sin(t * 0.6 + p.y * 0.05 + 0.6 * sin(t * 0.23));
        float h = sin(p.x * 0.18 + t * 1.1 + sin(p.y * 0.05)) * 0.22
                + sin(p.x * 0.07 - p.y * 0.11 + t * 0.7) * 0.3
                + sin(p.y * 0.31 + p.x * 0.21 + t * 1.7) * 0.07;
        return mix(lvl, h, far);
      }
      void main() {
        vec3 p = position;
        p.y = waveH(p.xz, uTime);
        float hx = waveH(p.xz + vec2(0.5, 0.0), uTime);
        float hz = waveH(p.xz + vec2(0.0, 0.5), uTime);
        vN = normalize(vec3(p.y - hx, 0.5, p.y - hz));
        vLocal = p;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uNight; uniform vec3 uMoon;
      varying vec3 vLocal; varying vec3 vWorld; varying vec3 vN;
      #include <fog_pars_fragment>
      ${SHORE_GLSL}
      void main() {
        float d = vLocal.x - shoreX(vLocal.z);
        float depth = vLocal.y - seabed(vLocal.x, vLocal.z);
        if (depth <= 0.0 || d < -1.0) discard;
        float t = uTime;
        vec3 V = normalize(cameraPosition - vWorld);
        // 細波紋（令月光閃下閃下）
        vec2 q = vLocal.xz;
        float n1 = vnoise(q * 1.3 + vec2(t * 0.5, t * 0.2)) - vnoise(q * 1.3 - vec2(t * 0.3, -t * 0.4) + 7.0);
        float n2 = vnoise(q * 1.1 + vec2(-t * 0.4, t * 0.3) + 3.0) - vnoise(q * 2.7 + vec2(t * 0.6, 0.0) + 11.0);
        vec3 N = normalize(vN + vec3(n1, 0.0, n2) * 0.45);
        // 顏色：淺水見到沙（透明啲），深水深藍
        vec3 deep = mix(vec3(0.02, 0.2, 0.38), vec3(0.004, 0.018, 0.055), uNight);
        vec3 shallow = mix(vec3(0.15, 0.6, 0.62), vec3(0.02, 0.13, 0.17), uNight);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 2.0, depth));
        float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 skyCol = mix(vec3(0.55, 0.75, 0.95), vec3(0.06, 0.08, 0.2), uNight);
        col += skyCol * (0.12 + 0.6 * fres);
        // 月光條路：月亮倒影閃閃下
        vec3 L = normalize(uMoon - vWorld);
        float s = max(dot(reflect(-V, N), L), 0.0);
        col += vec3(0.85, 0.92, 1.0) * (pow(s, 350.0) * 5.0 + pow(s, 40.0) * 0.18) * (0.25 + 0.75 * uNight);
        // 白泡：水邊一條 + 一行行湧埋嚟嘅浪
        float edge = 1.0 - smoothstep(0.0, 0.03, depth);
        float brk = vnoise(q * vec2(0.6, 0.35) + vec2(0.0, t * 0.15));
        float band = pow(max(sin(d * 0.9 + t * 1.5 + brk * 3.0), 0.0), 14.0) * (1.0 - smoothstep(2.0, 13.0, d)) * smoothstep(0.25, 0.7, brk);
        float foamNoise = vnoise(q * 6.0 + t * 0.3);
        float foam = clamp(edge * (0.55 + 0.45 * foamNoise) + band * 0.7, 0.0, 1.0);
        col = mix(col, vec3(0.92, 0.97, 1.0) * mix(1.0, 0.55, uNight), foam);
        // 夜光浮游生物：浪碰到就發藍綠色光，仲有一點點閃
        float spark = step(0.985, hash12(floor(q * 5.0) + floor(t * 3.0 + hash12(floor(q * 5.0)) * 7.0)));
        float shoreZone = (1.0 - smoothstep(0.0, 9.0, d));
        vec3 bio = vec3(0.1, 1.0, 0.85) * (foam * 1.6 + spark * shoreZone * 2.5 + edge * 0.6) * uNight;
        col += bio;
        float alpha = mix(0.35, 0.94, smoothstep(0.0, 0.45, depth));
        alpha = max(alpha, foam * 0.9);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const seaGeo = new THREE.PlaneGeometry(280, 320, 220, 130).rotateX(-Math.PI / 2).translate(SHORE - 3 + 140, 0, cz);
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.frustumCulled = false;
  root.add(sea);

  // ================= 天：銀河 + 北極光（一個大圓頂，疊加發光） =================
  const skyMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    fog: false,
    uniforms: { uTime: time, uSky: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uSky; varying vec3 vDir;
      ${SHORE_GLSL}
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        if (d.y < -0.02) discard;
        float horizon = smoothstep(-0.02, 0.12, d.y);
        // 銀河：斜斜一條，有雲狀光同黑色塵帶
        vec3 axis = normalize(vec3(0.5, 0.42, -0.75));
        float x = dot(d, axis);
        vec2 uv = vec2(atan(d.z, d.x) * 2.0, x * 6.0);
        float cloud = fbm(uv * 1.6 + 3.0);
        float band = exp(-pow(x / (0.16 + 0.06 * cloud), 2.0));
        float lane = smoothstep(0.35, 0.75, fbm(uv * 3.0 + 9.0)) * exp(-pow((x - 0.02) / 0.05, 2.0));
        vec3 milky = mix(vec3(0.2, 0.24, 0.5), vec3(0.75, 0.6, 0.85), cloud) * band * (0.2 + 0.5 * cloud) * (1.0 - 0.8 * lane);
        // 北極光：喺海嗰邊（+x）一幅幅綠色、紫色光簾，慢慢郁
        float az = atan(d.z, d.x);
        float el = asin(clamp(d.y, -1.0, 1.0));
        vec3 aur = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          float fk = float(k);
          float e0 = 0.035 + fk * 0.06 + 0.03 * sin(az * 3.0 + uTime * 0.12 + fk * 2.0) + 0.015 * sin(az * 9.0 - uTime * 0.25 + fk);
          float above = el - e0;
          float curtain = smoothstep(-0.012, 0.01, above) * exp(-max(above, 0.0) / (0.075 + fk * 0.035));
          float rays = 0.55 + 0.45 * sin(az * 70.0 + 5.0 * sin(az * 6.0 + uTime * 0.4) + uTime * 0.6 + fk * 3.0);
          rays *= 0.7 + 0.3 * vnoise(vec2(az * 25.0, uTime * 0.3 + fk * 5.0));
          float side = (1.0 - smoothstep(0.6, 1.35, abs(az + 0.15 - fk * 0.35)));
          vec3 c = mix(vec3(0.15, 1.0, 0.55), vec3(0.75, 0.25, 1.0), smoothstep(0.0, 0.22, above) + fk * 0.25);
          aur += c * curtain * rays * side * (0.6 - fk * 0.3);
        }
        // 地平線一層淡淡嘅藍綠光（唔會有一條黑邊）
        aur += vec3(0.08, 0.3, 0.32) * exp(-max(el, 0.0) / 0.05) * 0.35 * (1.0 - smoothstep(0.4, 1.6, abs(az)));
        vec3 col = (milky + aur) * horizon * uSky;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 24), skyMat);
  skyDome.position.set(44, 0, cz);
  skyDome.renderOrder = -5;
  skyDome.frustumCulled = false;
  root.add(skyDome);

  // 大月亮（有月球坑）+ 光暈
  const moonTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fffbea';
    ctx.fillRect(0, 0, 128, 128);
    const r = seeded(3);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(150,160,190,${0.15 + r() * 0.25})`;
      ctx.beginPath();
      ctx.arc(r() * 128, r() * 128, 3 + r() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const moonMat = new THREE.MeshBasicMaterial({ map: moonTex, color: new THREE.Color(1.6, 1.6, 1.55), transparent: true, opacity: 0, fog: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(11, 24, 16), moonMat);
  moon.position.copy(MOON);
  moon.rotation.y = -Math.PI / 2;
  root.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fb8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  moonGlow.scale.setScalar(95);
  moonGlow.position.copy(MOON);
  root.add(moonGlow);

  // 返去公園嘅傳送門（綠色漩渦）
  const portal = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x00e676, emissiveIntensity: 1.6 });
  add(portal, new THREE.TorusGeometry(1.6, 0.18, 10, 40), ringMat, 0, 2, 0, false);
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0xb9f6ca, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  swirl.position.y = 2;
  portal.add(swirl);
  portal.rotation.y = Math.PI / 2;
  portal.position.set(PORTAL.x, 0, PORTAL.z);
  root.add(portal);
  const portalLabel = makeLabel([{ text: '🌀 Back to the Park', color: '#b9f6ca' }], 0.8);
  portalLabel.position.set(PORTAL.x, 4.3, PORTAL.z);
  root.add(portalLabel);

  // ================= 棕櫚樹（會隨風擺，InstancedMesh） =================
  const PALMS = [
    // 沙灘入面（撞得）
    [27, 66, 1], [30, 97, 1.1], [41, 98, 0.9], [36, 65, 0.95], [55, 98.5, 1.05], [46, 64.5, 1], [33.5, 99.2, 0.85], [48.5, 99.3, 1.15], [61.8, 98.8, 0.95],
    [41, 63.6, 0.85], [52.6, 63.6, 1.1], [25.6, 73, 1.05], [25.4, 90, 1], [62.3, 63.7, 0.9],
    // 外面一圈（海角、森林邊）
    [68, 104, 1.2], [73, 106.5, 1], [79, 109, 1.15], [67, 59, 1.1], [73, 56.5, 1.25], [80, 54, 1], [21, 68, 1.1], [20.5, 79, 1.2], [21, 86.5, 1], [20, 95, 1.15],
    [30, 102.5, 1.2], [45, 103, 1.05], [58, 103.5, 1.25], [33, 60.5, 1.1], [50, 60, 1.2], [60, 60.5, 1],
  ];
  const palmTime = { value: 0 };
  const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  palmMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = palmTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      float ph = 0.0;
      #ifdef USE_INSTANCING
        ph = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.23;
      #endif
      float bend = max(position.y - 0.8, 0.0);
      bend = bend * bend * 0.011;
      transformed.x += sin(uTime * 1.1 + ph) * bend;
      transformed.z += cos(uTime * 0.83 + ph * 1.7) * bend * 0.7;
      float fl = smoothstep(0.6, 3.2, distance(position, vec3(${PALM_TOP.x.toFixed(2)}, ${PALM_TOP.y.toFixed(2)}, 0.0)));
      transformed.y += sin(uTime * 3.1 + ph + position.x * 1.3 + position.z * 1.7) * 0.08 * fl;`);
  };
  const palms = new THREE.InstancedMesh(palmGeometry(), palmMat, PALMS.length);
  {
    const r = seeded(21);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    PALMS.forEach(([x, z, s], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.25), s));
      palms.setMatrixAt(i, m);
      if (x > minX && x < maxX && z > minZ && z < maxZ) addCollider(x, z, 0.45);
    });
  }
  palms.castShadow = true;
  palms.receiveShadow = true;
  root.add(palms);

  // ================= 森林 + 大大棵超高嘅樹做邊界 =================
  // （小朋友：「make a forest around the outside beach... the border will be big giant tall trees」）
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    // 西、南、北三邊（東邊係海）：森林帶 3–14 米厚
    const side = i % 3;
    const depth = 3 + rnd() * 11;
    const x = side === 0 ? minX - depth : minX - 6 + rnd() * (maxX - minX + 10);
    const z = side === 1 ? minZ - depth : side === 2 ? maxZ + depth : minZ - 4 + rnd() * (maxZ - minZ + 8);
    const s = 0.9 + rnd() * 0.7;
    const kind = rnd();
    if (side !== 0 && x > maxX - 6) continue; // 海角留返俾棕櫚樹
    forestTree(deco, x, z, s, kind);
  }
  // 最外面一圈：巨型高樹（西邊一行、南北兩行）
  for (let z = minZ - 15; z <= maxZ + 15; z += 9) giantTree(deco, minX - 19, z, 1 + rnd() * 0.4);
  for (let x = minX - 10; x <= maxX + 2; x += 9) {
    giantTree(deco, x, minZ - 16, 1 + rnd() * 0.4);
    giantTree(deco, x + 4, maxZ + 16, 1 + rnd() * 0.4);
  }
  // 沙丘草（後面近森林）
  {
    const grass = [mat(0x7cb342), mat(0x9ccc65), mat(0x558b2f)];
    const r = seeded(31);
    for (let i = 0; i < 70; i++) {
      const edge = i % 3;
      const x = edge === 0 ? minX + 0.5 + r() * 3 : minX + 4 + r() * (maxX - minX - 14);
      const z = edge === 1 ? minZ + 0.3 + r() * 1.8 : edge === 2 ? maxZ - 0.3 - r() * 1.8 : minZ + 2 + r() * (maxZ - minZ - 4);
      if (Math.hypot(x - PORTAL.x, z - PORTAL.z) < 3.5) continue;
      for (let b = 0; b < 4; b++) {
        const h = 0.5 + r() * 0.6;
        const blade = add(deco, new THREE.ConeGeometry(0.05, h, 3), grass[b % 3], x + (r() - 0.5) * 0.4, h / 2, z + (r() - 0.5) * 0.4, false);
        blade.rotation.set((r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6);
      }
    }
  }

  // ================= 石頭（舊嗰幾舊保留：Crazy 掣喺 57,66 嗰舊圓石後面） =================
  const rockMats = [mat(0x9e9e9e, { flatShading: true }), mat(0x78909c, { flatShading: true }), mat(0x8d8d8d, { flatShading: true })];
  const rock = (x, z, r, i = 0, y = r * 0.5) => {
    const m = add(deco, new THREE.DodecahedronGeometry(r), rockMats[i % 3], x, y, z);
    m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    m.scale.y = 0.75 + (i % 3) * 0.12;
    return m;
  };
  for (const [x, z, r] of [[33, 90, 0.8], [44, 87, 0.6], [57, 66, 0.9], [38, 76, 0.5]]) {
    rock(x, z, r);
    addCollider(x, z, r);
  }
  // 海入面嘅大石（南邊、北邊海角）
  [[70, 64, 1.6], [72.5, 66, 1.0], [75, 61, 2.1], [69, 99, 1.3], [66.5, 101, 0.9], [84, 70, 1.4], [88, 92, 1.1]].forEach(([x, z, r], i) => rock(x, z, r, i + 1, seabed(x, z) + r * 0.35));

  // ================= 潮池（石圍住一個個小水氹：海星、海葵、會發光） =================
  const POOLS = [[60.2, 68.6, 1.15], [62.2, 71.2, 0.8], [59.4, 71.6, 0.6]];
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x0b3c48, emissive: 0x0a7f8f, emissiveIntensity: 0.2, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.88 });
  const pools = [];
  POOLS.forEach(([x, z, r], pi) => {
    add(deco, new THREE.CircleGeometry(r + 0.15, 20).rotateX(-Math.PI / 2), mat(0x8d7b62), x, 0.01, z, false); // 池底
    pools.push(add(root, new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), poolMat, x, 0.04, z, false));
    const n = Math.round(r * 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + pi;
      const rr = 0.18 + ((i * 7 + pi) % 5) * 0.06;
      rock(x + Math.cos(a) * (r + 0.15), z + Math.sin(a) * (r + 0.15), rr, i + pi, rr * 0.3);
    }
  });
  const starGeo5 = starfishGeometry();
  [[60.4, 68.2, 0xff7043], [61.9, 71.4, 0xab47bc], [59.2, 71.7, 0xffca28], [53, 69, 0xff8a65], [36, 86, 0xff7043], [58, 92, 0xf06292], [45, 95, 0xffb74d]].forEach(([x, z, c], i) => {
    const s = add(deco, starGeo5, mat(c, { roughness: 0.9 }), x, POOLS.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr) ? 0.02 : 0.01, z, false);
    s.rotation.y = i * 1.1;
  });
  // 海葵：頂部發粉紅／紫光
  [[60.9, 69.2], [59.6, 68.1], [61.6, 68.9], [62.6, 70.8], [59.6, 71.3]].forEach(([x, z], i) => {
    add(deco, new THREE.CylinderGeometry(0.06, 0.09, 0.14, 7), mat(0x880e4f), x, 0.07, z, false);
    add(deco, new THREE.SphereGeometry(0.1, 8, 6), mat(i % 2 ? 0xff80ab : 0xce93d8, { emissive: i % 2 ? 0xff4081 : 0xaa00ff, emissiveIntensity: 1.4 }), x, 0.16, z, false);
  });
  for (const [x, z, r] of POOLS) addCollider(x, z, r * 0.55); // 唔好踩落潮池

  // 貝殼（周圍散住）
  for (let i = 0; i < 34; i++) {
    const x = minX + 3 + ((i * 37) % 36);
    const z = minZ + 2 + ((i * 53) % 34);
    if (Math.hypot(x - (PIER.minX + 1), z - CZ) < 2) continue;
    if (i % 2) add(deco, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 5), mat(i % 4 === 1 ? 0xff7043 : 0xffab91), x, 0.04, z, false).rotation.y = i;
    else add(deco, new THREE.SphereGeometry(0.14, 8, 6), mat(0xfff8e1), x, 0.05, z, false).scale.y = 0.5;
  }

  // ================= 木碼頭（行得出去海上面睇流星） =================
  const DECK_TOP = 0.4;
  {
    const wood = [mat(0x8d6e63, { roughness: 0.9 }), mat(0x795548, { roughness: 0.9 }), mat(0xa1887f, { roughness: 0.9 })];
    const dark = mat(0x4e342e, { roughness: 0.95 });
    const x0 = PIER.minX + 0.5;
    const x1 = PIER.maxX - 0.4;
    const z0 = cz - 1.4;
    const z1 = cz + 1.4;
    let k = 0;
    for (let x = x0; x < x1; x += 0.48, k++) add(deco, new THREE.BoxGeometry(0.42, 0.1, 2.8 + (k % 3) * 0.06), wood[k % 3], x + 0.21, DECK_TOP - 0.05, cz).rotation.y = ((k % 5) - 2) * 0.006;
    for (const z of [z0 + 0.2, z1 - 0.2]) add(deco, new THREE.BoxGeometry(x1 - x0, 0.18, 0.2), dark, (x0 + x1) / 2, DECK_TOP - 0.19, z); // 橫樑
    add(deco, new THREE.BoxGeometry(0.6, 0.2, 2.6), wood[1], x0 - 0.3, 0.1, cz); // 一級樓梯
    for (let x = x0 + 1.5; x <= x1; x += 3) {
      for (const z of [z0, z1]) {
        const bottom = seabed(x, z) - 0.6;
        const top = x >= SHORE - 1.5 ? DECK_TOP + 0.9 : DECK_TOP; // 出到海先有欄杆柱
        add(deco, new THREE.CylinderGeometry(0.13, 0.15, top - bottom, 8), dark, x, (top + bottom) / 2, z);
      }
    }
    // 繩欄杆
    for (const z of [z0, z1]) {
      for (let x = Math.ceil((SHORE - 1.5 - x0 - 1.5) / 3) * 3 + x0 + 1.5; x + 3 <= x1; x += 3) {
        const rope = add(deco, new THREE.CylinderGeometry(0.03, 0.03, 3, 5), mat(0xd7ccc8), x + 1.5, DECK_TOP + 0.72, z, false);
        rope.rotation.z = Math.PI / 2;
      }
    }
    // 尾端兩支燈柱（暖黃色燈籠）
    for (const z of [z0 + 0.1, z1 - 0.1]) {
      add(deco, new THREE.BoxGeometry(0.16, 2.2, 0.16), dark, x1 - 0.3, DECK_TOP + 1.1, z);
      add(deco, new THREE.BoxGeometry(0.42, 0.5, 0.42), mat(0xffe082, { emissive: 0xffb300, emissiveIntensity: 2.4 }), x1 - 0.3, DECK_TOP + 2.35, z, false);
      add(deco, new THREE.ConeGeometry(0.36, 0.3, 4), dark, x1 - 0.3, DECK_TOP + 2.75, z).rotation.y = Math.PI / 4;
    }
    // 綁住喺碼頭邊嘅小艇
    const boat = new THREE.Group();
    add(boat, rbox(3, 0.55, 1.2), mat(0x1e88e5), 0, 0, 0);
    add(boat, rbox(2.6, 0.12, 0.9), mat(0xffffff), 0, 0.26, 0);
    add(boat, new THREE.BoxGeometry(0.3, 0.08, 1.0), mat(0x8d6e63), 0.3, 0.3, 0);
    boat.position.set(74, -0.05, z0 - 1.3);
    boat.rotation.set(0.04, 0.12, 0.03);
    deco.add(boat);
    // 碼頭塊牌
    const pierLabel = makeLabel([{ text: '🌊 Moonlight Pier', color: '#ffe082' }], 0.7);
    pierLabel.position.set(x0 + 0.3, 2.2, z1 + 0.3);
    root.add(pierLabel);
    add(deco, new THREE.BoxGeometry(0.14, 1.5, 0.14), dark, x0 + 0.3, 0.75, z1 + 0.3);
    // 行得上去（world.js platforms）
    addPlatform({ minX: x0 - 0.6 + OFF, maxX: x0 + OFF, minZ: z0 + 0.1, maxZ: z1 - 0.1 }, 0.2);
    addPlatform({ minX: x0 + OFF, maxX: x1 + OFF, minZ: z0, maxZ: z1 }, DECK_TOP);
  }

  // ================= 燈塔（喺北邊海上嘅石島，有燈光轉嚟轉去） =================
  const LH = { x: 92, z: 104 };
  const beam = new THREE.Group();
  let lanternMat;
  {
    const r = seeded(41);
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * 4.5;
      rock(LH.x + Math.cos(a) * d, LH.z + Math.sin(a) * d, 1.4 + r() * 1.6, i, -0.4 + r() * 0.6);
    }
    const H = 15;
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const r0 = 2.3 - (i / bands) * 0.8;
      const r1 = 2.3 - ((i + 1) / bands) * 0.8;
      add(deco, new THREE.CylinderGeometry(r1, r0, H / bands, 20), mat(i % 2 ? 0xffffff : 0xe53935, { roughness: 0.5 }), LH.x, 1.5 + (i + 0.5) * (H / bands), LH.z);
    }
    const top = 1.5 + H;
    add(deco, new THREE.CylinderGeometry(2.1, 2.1, 0.3, 20), mat(0x37474f), LH.x, top + 0.15, LH.z); // 露台
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      add(deco, new THREE.BoxGeometry(0.08, 0.8, 0.08), mat(0x263238), LH.x + Math.cos(a) * 1.95, top + 0.7, LH.z + Math.sin(a) * 1.95, false);
    }
    lanternMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xffe082, emissiveIntensity: 3 });
    add(root, new THREE.CylinderGeometry(1.1, 1.1, 1.8, 14), lanternMat, LH.x, top + 1.2, LH.z, false);
    add(deco, new THREE.ConeGeometry(1.5, 1.4, 14), mat(0xc62828), LH.x, top + 2.8, LH.z);
    add(deco, new THREE.SphereGeometry(0.25, 8, 6), mat(0x263238), LH.x, top + 3.6, LH.z);
    // 兩條光束（尖頭喺燈，越遠越淡）
    const fadeTex = (() => {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, '#fff');
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 64);
      return new THREE.CanvasTexture(c);
    })();
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c1, alphaMap: fadeTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const a of [0, Math.PI]) {
      const g = new THREE.ConeGeometry(4.5, 50, 24, 1, true).translate(0, -25, 0).rotateZ(Math.PI / 2);
      const m = new THREE.Mesh(g, beamMat);
      m.rotation.set(0, a, 0.04);
      beam.add(m);
    }
    beam.position.set(LH.x, top + 1.2, LH.z);
    root.add(beam);
    const lhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe082, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    lhGlow.scale.setScalar(9);
    lhGlow.position.copy(beam.position);
    root.add(lhGlow);
  }

  // ================= 篝火（石圈、火星、暖光）+ 木頭凳 + 火把 =================
  const FIRE = { x: BENCH.x - 2.4, z: BENCH.z + 3 };
  const fire = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    rock(FIRE.x + Math.cos(a) * 0.75, FIRE.z + Math.sin(a) * 0.75, 0.2, i, 0.08);
  }
  for (let i = 0; i < 5; i++) add(deco, new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6), mat(0x5d4037), FIRE.x + Math.cos(i * 1.26) * 0.3, 0.12, FIRE.z + Math.sin(i * 1.26) * 0.3).rotation.set(Math.PI / 2, i * 1.26, 0);
  add(deco, new THREE.CircleGeometry(0.55, 16).rotateX(-Math.PI / 2), mat(0x3e2723, { emissive: 0xff3d00, emissiveIntensity: 1.2 }), FIRE.x, 0.03, FIRE.z, false); // 炭
  const flameMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [0xff3d00, 0xff6d00, 0xffab00, 0xffee58].map((c, i) => add(fire, new THREE.ConeGeometry(0.5 - i * 0.09, 1.5 - i * 0.22, 7).translate(0, (1.5 - i * 0.22) / 2, 0), flameMat(c), Math.sin(i * 2) * 0.06, 0.18, Math.cos(i * 2) * 0.06, false));
  fire.position.set(FIRE.x, 0, FIRE.z);
  root.add(fire);
  addCollider(FIRE.x, FIRE.z, 0.85);
  const fireLight = new THREE.PointLight(0xff8a3d, 0, 16, 1.6);
  fireLight.position.set(FIRE.x, 1.3, FIRE.z);
  root.add(fireLight);
  // 火星：一粒粒向上飄
  const SPARK_N = 40;
  const sparkPos = new Float32Array(SPARK_N * 3);
  const sparks = Array.from({ length: SPARK_N }, () => ({ t: Math.random() * 2, life: 1.2 + Math.random() * 1.4, vx: 0, vz: 0, x: 0, y: 0, z: 0 }));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(0xffa040).multiplyScalar(2), size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkPts.frustumCulled = false;
  root.add(sparkPts);
  // 木頭凳（圍住篝火）
  const logSeat = (x, z, rotY) => {
    const g = add(deco, new THREE.CylinderGeometry(0.28, 0.3, 2, 10), mat(0x6d4c41, { roughness: 0.95 }), x, 0.28, z);
    g.rotation.set(0, rotY, Math.PI / 2);
    for (const s of [-1, 1]) add(deco, new THREE.CircleGeometry(0.27, 10), mat(0xd7a86e), x + Math.cos(rotY) * s * 1.005, 0.28, z - Math.sin(rotY) * s * 1.005, false).rotation.y = rotY + (s > 0 ? Math.PI / 2 : -Math.PI / 2);
    addCollider(x + Math.cos(rotY) * 0.55, z - Math.sin(rotY) * 0.55, 0.35);
    addCollider(x - Math.cos(rotY) * 0.55, z + Math.sin(rotY) * 0.55, 0.35);
  };
  logSeat(FIRE.x - 2.1, FIRE.z, Math.PI / 2); // 西邊（沿 z）
  logSeat(FIRE.x + 0.2, FIRE.z + 2.1, 0); // 北邊（沿 x）
  // 火把：由傳送門一路照去篝火
  const torchFlames = [];
  for (const [x, z] of [[33.5, 79.3], [33.5, 83.7], [39.5, 79.3], [39.5, 83.7]]) {
    add(deco, new THREE.CylinderGeometry(0.07, 0.09, 2, 6), mat(0xc0a060), x, 1, z);
    add(deco, new THREE.CylinderGeometry(0.16, 0.1, 0.3, 8), mat(0x5d4037), x, 2.1, z);
    const f = add(root, new THREE.ConeGeometry(0.15, 0.5, 7).translate(0, 0.25, 0), flameMat(0xff9100), x, 2.2, z, false);
    const f2 = add(root, new THREE.ConeGeometry(0.08, 0.32, 7).translate(0, 0.16, 0), flameMat(0xffee58), x, 2.22, z, false);
    torchFlames.push(f, f2);
    addCollider(x, z, 0.25);
  }

  // 長櫈（面向海）
  const wood = mat(0xa1887f);
  const bench = new THREE.Group();
  add(bench, rbox(0.7, 0.12, 2.6), wood, 0, 0.55, 0);
  add(bench, rbox(0.1, 0.6, 2.6), wood, -0.32, 0.9, 0);
  for (const s of [-1, 1]) add(bench, new THREE.BoxGeometry(0.6, 0.55, 0.12), mat(0x5d4037), 0, 0.27, s * 1.1);
  add(bench, rbox(0.55, 0.06, 0.9), mat(0x5c6bc0), 0.02, 0.63, 0.6); // 張毛氈
  bench.position.set(BENCH.x, 0, BENCH.z);
  root.add(bench);
  const benchLabel = makeLabel([{ text: '🌠 Sit here', color: '#fff59d' }], 0.7);
  benchLabel.position.set(BENCH.x, 1.9, BENCH.z);
  root.add(benchLabel);

  // ================= 海龜竇：BB 海龜孵出嚟，一隻隻爬落海（保育！） =================
  const NEST = { x: 51, z: 89.5 };
  add(deco, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.22, 1.1), mat(0xe2c792, { roughness: 1 }), NEST.x, 0, NEST.z, false);
  for (let i = 0; i < 7; i++) add(deco, new THREE.SphereGeometry(0.1, 8, 6), mat(0xfffde7), NEST.x - 0.3 + (i % 3) * 0.25, 0.27, NEST.z - 0.25 + Math.floor(i / 3) * 0.25, false).scale.y = 1.15;
  // 一圈木樁 + 繩（向海嗰邊開口，等 BB 爬出去）
  {
    const n = 9;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 0.32 + (i / n) * Math.PI * 1.36; // 開口向 +x
      const p = { x: NEST.x + Math.cos(a) * 1.7, z: NEST.z + Math.sin(a) * 1.7 };
      add(deco, new THREE.BoxGeometry(0.08, 0.6, 0.08), mat(0x8d6e63), p.x, 0.3, p.z);
      if (prev) {
        const len = Math.hypot(p.x - prev.x, p.z - prev.z);
        const rope = add(deco, new THREE.CylinderGeometry(0.02, 0.02, len, 4), mat(0xffcc80), (p.x + prev.x) / 2, 0.5, (p.z + prev.z) / 2, false);
        rope.rotation.set(0, -Math.atan2(p.z - prev.z, p.x - prev.x), Math.PI / 2);
      }
      prev = p;
    }
    addCollider(NEST.x, NEST.z, 1.5);
    const sign = makeSign([{ text: '🐢 Sea Turtle Nest', size: 0.34 }, { text: 'Let the babies reach the sea!', size: 0.2 }], 1.8, 0.8, THEMES.green);
    // 塊牌喺西南面，斜斜面向由傳送門／篝火行過嚟嘅人；兩支柱喺兩邊
    const sp = { x: NEST.x - 1.6, z: NEST.z - 2.1 };
    sign.position.set(sp.x, 1.15, sp.z);
    sign.rotation.y = -Math.PI * 0.75;
    root.add(sign);
    for (const s of [-1, 1]) add(deco, new THREE.BoxGeometry(0.1, 1.55, 0.1), mat(0x6d4c41), sp.x - 0.707 * 0.95 * s, 0.775, sp.z + 0.707 * 0.95 * s);
  }
  const TURTLE_N = 7;
  const turtles = new THREE.InstancedMesh(turtleGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), TURTLE_N);
  turtles.castShadow = true;
  turtles.frustumCulled = false;
  root.add(turtles);
  const babies = Array.from({ length: TURTLE_N }, (_, i) => ({ t: -i * 2.6, speed: 0.75 + Math.random() * 0.3, tz: 0, x: 0, z: 0 }));
  const resetBaby = (b) => {
    b.x = NEST.x + (Math.random() - 0.5) * 0.5;
    b.z = NEST.z + (Math.random() - 0.5) * 0.5;
    b.tz = NEST.z + (Math.random() - 0.5) * 7;
    b.t = 0;
  };
  babies.forEach(resetBaby);
  babies.forEach((b, i) => (b.t = -i * 2.6));

  // ================= 蟹仔：喺濕沙度打橫行 =================
  const CRAB_LANES = [[66, 77], [85.5, 93], [64.5, 67.5], [72, 78.5], [86, 98]];
  const crabs = new THREE.InstancedMesh(crabGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), CRAB_LANES.length);
  crabs.castShadow = true;
  crabs.frustumCulled = false;
  root.add(crabs);
  const crabState = CRAB_LANES.map(([a, b], i) => ({ a, b, z: a + Math.random() * (b - a), x: 61.5 + (i % 3) * 0.8, dir: i % 2 ? 1 : -1, pause: Math.random() * 2, phase: i }));

  // ================= 螢火蟲（森林邊、棕櫚樹下） =================
  const FLY_N = 70;
  const flyPos = new Float32Array(FLY_N * 3);
  const flyCol = new Float32Array(FLY_N * 3);
  const flies = Array.from({ length: FLY_N }, (_, i) => {
    const r = seeded(100 + i);
    const zone = i % 4;
    const x = zone === 0 ? minX + r() * 6 : minX + 4 + r() * 30;
    const z = zone === 1 ? minZ + r() * 4 : zone === 2 ? maxZ - r() * 4 : minZ + r() * (maxZ - minZ);
    return { x, z, y: 0.6 + r() * 2.6, ph: r() * 10, sp: 0.3 + r() * 0.5, blink: 1 + r() * 2 };
  });
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  flyGeo.setAttribute('color', new THREE.BufferAttribute(flyCol, 3));
  const flyPts = new THREE.Points(flyGeo, new THREE.PointsMaterial({ map: glowTex, vertexColors: true, size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flyPts.frustumCulled = false;
  root.add(flyPts);

  // 神秘人：坐喺石上面望住個海（Ninja 樣，認唔出係邊個）
  add(deco, new THREE.DodecahedronGeometry(0.9), mat(0x8d8d8d, { flatShading: true }), STRANGER.x, 0.35, STRANGER.z);
  addCollider(STRANGER.x, STRANGER.z, 1.0);
  const stranger = buildAvatar();
  applyRangerSkin({ avatar: stranger }, RANGER_SKINS.find((s) => s.id === 'ninja'));
  stranger.g.scale.setScalar(1.15);
  root.add(stranger.g);
  const strangerLabel = makeLabel([{ text: '❓ ???', color: '#e1bee7' }], 0.8);
  strangerLabel.position.y = 3.1;
  stranger.g.add(strangerLabel);
  stranger.label = strangerLabel;
  beach.stranger = stranger;
  sitStranger();

  // ================= 星空：成個天都係星，有大有細、有啲帶顏色、會閃 =================
  const STAR_N = 2400;
  const BAND_AXIS = new THREE.Vector3(0.5, 0.42, -0.75).normalize(); // 同銀河 shader 一樣
  const starPos = new Float32Array(STAR_N * 3);
  const starSize = new Float32Array(STAR_N);
  const starPhase = new Float32Array(STAR_N);
  const starCol = new Float32Array(STAR_N * 3);
  const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.9, 0.75], [0.9, 0.8, 1]];
  for (let i = 0; i < STAR_N; i++) {
    const r = 360;
    const dir = new THREE.Vector3();
    do {
      const a = Math.random() * Math.PI * 2;
      const h = Math.asin(0.03 + Math.random() * 0.97);
      dir.set(Math.cos(a) * Math.cos(h), Math.sin(h), Math.sin(a) * Math.cos(h));
      if (i % 3 === 0) dir.addScaledVector(BAND_AXIS, -dir.dot(BAND_AXIS) * (0.75 + Math.random() * 0.25)).normalize(); // 三分一粒擠埋銀河度
    } while (dir.y < 0.03);
    starPos.set([44 + dir.x * r, dir.y * r, cz + dir.z * r], i * 3);
    const big = Math.random();
    starSize[i] = big > 0.985 ? 5 + Math.random() * 2 : big > 0.9 ? 3 + Math.random() : 1.4 + Math.random() * 1.2;
    starPhase[i] = Math.random() * 10;
    starCol.set(tints[i % 4], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uTime: time, uSky: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vCol; varying float vTw;
      void main() {
        vTw = 0.6 + 0.4 * sin(uTime * (1.3 + fract(aPhase) * 2.5) + aPhase * 6.0);
        vCol = aColor * (aSize > 4.0 ? 2.2 : 1.1);
        gl_PointSize = aSize * (0.75 + 0.25 * vTw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSky; varying vec3 vCol; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.0, 0.5, d));
        gl_FragColor = vec4(vCol * vTw * a * uSky, 1.0);
      }`,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  root.add(stars);
  beach.stars = stars;

  // 流星雨（小朋友：要型啲）：好多粒，有發光頭、長長嘅彩色尾、閃粉尾巴；間中有粒大火流星跌落海，水面閃一下
  const COLORS = [0x80d8ff, 0xffe57f, 0xea80fc, 0xb9f6ca, 0xff8a80];
  const TRAIL = 22;
  const meteors = Array.from({ length: 22 }, (_, i) => {
    const big = i < 2; // 兩粒大火流星
    const color = big ? 0xff9100 : COLORS[i % COLORS.length];
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(big ? 1.3 : 0.45, 10, 8), new THREE.MeshBasicMaterial({ color: big ? 0xfff3e0 : 0xffffff, fog: false }));
    g.add(head);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(big ? 9 : 3.5);
    g.add(halo);
    const tailLen = big ? 40 : 30;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, big ? 1.1 : 0.55, tailLen, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    tail.geometry.translate(0, tailLen / 2, 0);
    g.add(tail);
    root.add(g);
    // 閃粉尾巴（跟住流星行過嘅位）
    const tp = new Float32Array(TRAIL * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const trail = new THREE.Points(tg, new THREE.PointsMaterial({ color, size: big ? 1.4 : 0.7, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    trail.frustumCulled = false;
    root.add(trail);
    return { g, halo, tail, trail, tp, tg, big, t: 0, dur: big ? 2.6 : 1.2 + Math.random() * 0.8, wait: Math.random() * 5, from: new THREE.Vector3(), to: new THREE.Vector3(), hist: [] };
  });
  // 大火流星跌落海：水面一圈光
  const splashRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0xffcc80, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  splashRing.rotation.x = -Math.PI / 2;
  root.add(splashRing);
  let splashT = 99;
  const resetMeteor = (m) => {
    const z = cz + (Math.random() - 0.5) * 150;
    if (m.big) {
      m.from.set(maxX + 120 + Math.random() * 60, 95 + Math.random() * 20, z);
      m.to.set(maxX + 40 + Math.random() * 40, 0.2, cz + (Math.random() - 0.5) * 60); // 跌落海
    } else {
      m.from.set(maxX + 50 + Math.random() * 150, 60 + Math.random() * 50, z);
      m.to.copy(m.from).add(new THREE.Vector3(-30 - Math.random() * 30, -40 - Math.random() * 25, (Math.random() - 0.5) * 50));
    }
    const dir = m.from.clone().sub(m.to).normalize();
    m.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // 條尾向返嚟嘅方向
    m.t = 0;
    m.hist.length = 0;
  };
  meteors.forEach(resetMeteor);
  beach.meteorBoost = 1; // 秘密結局時流星雨

  bakeStatic(deco, scene); // 唔郁嘅嘢焊埋（少好多 draw call）

  const mtx = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const sc = new THREE.Vector3();
  return (dt, t) => {
    time.value = t;
    palmTime.value = t;
    seaMat.uniforms.uTime.value = t;
    beachSky(dt);
    const k = beach.sky;
    seaMat.uniforms.uNight.value = k;
    skyMat.uniforms.uSky.value = k;
    starMat.uniforms.uSky.value = k * 0.95;
    moonMat.opacity = k;
    moonGlow.material.opacity = k * 0.55;
    // 喺公園入面（k = 0）：成個天空圓頂都包住公園，唔收埋就會每格白白計晒成個畫面
    const showSky = k > 0.001;
    skyDome.visible = stars.visible = moon.visible = moonGlow.visible = flyPts.visible = showSky;
    swirl.rotation.z = t * 2;
    ringMat.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.4;

    // 篝火：火焰跳、火光閃
    flames.forEach((f, i) => {
      f.scale.set(1 + Math.sin(t * 7 + i) * 0.08, 1 + Math.sin(t * 9 + i * 2) * 0.25 + Math.sin(t * 23 + i) * 0.08, 1 + Math.cos(t * 6 + i) * 0.08);
      f.rotation.y = t * (i + 1) * 0.7;
    });
    torchFlames.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 11 + i * 1.7) * 0.2));
    fireLight.intensity = (7 + Math.sin(t * 13) * 1.2 + Math.sin(t * 7.3) * 0.9) * (0.3 + 0.7 * k);
    for (let i = 0; i < SPARK_N; i++) {
      const s = sparks[i];
      s.t += dt;
      if (s.t > s.life) {
        s.t = 0;
        s.life = 1.2 + Math.random() * 1.4;
        s.x = FIRE.x + (Math.random() - 0.5) * 0.5;
        s.z = FIRE.z + (Math.random() - 0.5) * 0.5;
        s.y = 0.4;
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vz = (Math.random() - 0.5) * 0.5;
      }
      s.x += (s.vx + Math.sin(t * 3 + i) * 0.3) * dt;
      s.z += s.vz * dt;
      s.y += (1.3 + (i % 5) * 0.2) * dt;
      sparkPos.set(s.t / s.life > 0.95 ? [0, -99, 0] : [s.x, s.y, s.z], i * 3);
    }
    sparkGeo.attributes.position.needsUpdate = true;

    // 燈塔光轉圈
    beam.rotation.y = t * 0.5;
    lanternMat.emissiveIntensity = 2.6 + Math.sin(t * 2) * 0.4;
    poolMat.emissiveIntensity = 0.1 + 0.22 * k + Math.sin(t * 1.5) * 0.05;

    // 海龜 BB：由竇度鑽出嚟 → 爬向海 → 游走 → 再孵過
    babies.forEach((b, i) => {
      b.t += dt;
      let y = 0;
      let s = 1;
      let yaw = 0;
      if (b.t < 0) s = 0;
      else if (b.t < 0.8) {
        y = -0.25 + (b.t / 0.8) * 0.45; // 鑽出嚟
        s = b.t / 0.8;
      } else {
        const dx = 66 - b.x;
        const dz = b.tz - b.z;
        const len = Math.hypot(dx, dz);
        const step = b.speed * dt * (0.7 + 0.3 * Math.abs(Math.sin(b.t * 6)));
        b.x += (dx / len) * step;
        b.z += (dz / len) * step;
        yaw = -Math.atan2(dz, dx) + Math.sin(b.t * 8) * 0.25;
        y = 0.2 * Math.max(0, 1 - (b.t - 0.8) * 2) + Math.abs(Math.sin(b.t * 8)) * 0.02;
        const wet = b.x - (SHORE - 0.6);
        if (wet > 0) {
          y = -wet * 0.12; // 落咗水：慢慢沉落去游走
          s = Math.max(0, 1 - wet / 2.2);
          if (s <= 0) {
            resetBaby(b);
            b.t = -1.5 - Math.random() * 3;
          }
        }
      }
      eul.set(0, yaw, 0);
      qt.setFromEuler(eul);
      mtx.compose(v3.set(b.x, Math.max(y, -0.3), b.z), qt, sc.setScalar(Math.max(0.001, s) * 1.5)); // 大少少，小朋友先睇得清楚
      turtles.setMatrixAt(i, mtx);
    });
    turtles.instanceMatrix.needsUpdate = true;

    // 蟹仔：走一段、停一停、轉方向
    crabState.forEach((c, i) => {
      if (c.pause > 0) c.pause -= dt;
      else {
        c.z += c.dir * 1.6 * dt;
        if (c.z < c.a || c.z > c.b || Math.random() < dt * 0.3) {
          c.dir *= -1;
          c.z = Math.max(c.a, Math.min(c.b, c.z));
          c.pause = 0.5 + Math.random() * 2;
        }
      }
      const walking = c.pause <= 0;
      eul.set(0, Math.sin(t * 2 + i) * 0.2, walking ? Math.sin(t * 30 + i) * 0.06 : 0);
      qt.setFromEuler(eul);
      mtx.compose(v3.set(c.x, walking ? Math.abs(Math.sin(t * 25 + i)) * 0.03 : 0, c.z), qt, sc.setScalar(1.3));
      crabs.setMatrixAt(i, mtx);
    });
    crabs.instanceMatrix.needsUpdate = true;

    // 螢火蟲：飄嚟飄去、一閃一閃
    flies.forEach((f, i) => {
      const a = t * f.sp + f.ph;
      flyPos.set([f.x + Math.sin(a) * 1.6 + Math.sin(a * 2.3) * 0.4, f.y + Math.sin(a * 1.7) * 0.5, f.z + Math.cos(a * 0.9) * 1.6], i * 3);
      const glow = Math.pow(Math.max(0, Math.sin(t * f.blink + f.ph)), 3) * 2.2 * k;
      flyCol.set([glow * 0.9, glow, glow * 0.35], i * 3);
    });
    flyGeo.attributes.position.needsUpdate = true;
    flyGeo.attributes.color.needsUpdate = true;

    for (const m of meteors) {
      if (m.wait > 0) {
        m.wait -= dt * beach.meteorBoost;
        m.g.visible = false;
        m.trail.visible = false;
        continue;
      }
      m.t += dt;
      const kk = Math.min(1, m.t / m.dur);
      const show = beach.sky > 0.15;
      m.g.visible = show;
      m.trail.visible = show;
      m.g.position.lerpVectors(m.from, m.to, m.big ? kk * kk : kk);
      const fade = Math.sin(kk * Math.PI);
      m.tail.material.opacity = 0.75 * (m.big ? 1 : fade);
      m.halo.material.opacity = m.big ? 1 : fade;
      // 閃粉尾巴：記低之前嘅位，慢慢散開
      m.hist.unshift(m.g.position.clone());
      if (m.hist.length > TRAIL) m.hist.pop();
      m.hist.forEach((p, j) => {
        m.tp[j * 3] = p.x + Math.sin(j * 7 + t * 3) * j * 0.08;
        m.tp[j * 3 + 1] = p.y - j * 0.12;
        m.tp[j * 3 + 2] = p.z + Math.cos(j * 5 + t * 3) * j * 0.08;
      });
      for (let j = m.hist.length; j < TRAIL; j++) m.tp[j * 3 + 1] = -9999;
      m.tg.attributes.position.needsUpdate = true;
      if (kk >= 1) {
        if (m.big && show) {
          splashRing.position.set(m.to.x, 0.3, m.to.z);
          splashT = 0;
        }
        resetMeteor(m);
        m.wait = (m.big ? 6 + Math.random() * 6 : 1.2 + Math.random() * 3.5) / beach.meteorBoost;
      }
    }
    splashT += dt;
    splashRing.material.opacity = Math.max(0, 1 - splashT / 1.5);
    splashRing.scale.setScalar(1 + splashT * 14);
  };
}

// 喺沙灘入面：天慢慢變星空（main.js 設定 beach.inside）
function beachSky(dt) {
  const target = beach.inside ? 1 : 0;
  beach.sky += (target - beach.sky) * Math.min(1, dt * 1.5);
}

// 神秘人坐返喺石上面
export function sitStranger() {
  const s = beach.stranger;
  s.g.position.set(STRANGER.x, 0.25, STRANGER.z);
  s.g.rotation.set(0, -Math.PI / 2, 0); // 面向 +x（海）
  for (const leg of s.legs) leg.rotation.x = Math.PI / 2; // 坐低（隻腳向前）
  for (const arm of s.arms) arm.rotation.x = 0;
  s.label.visible = true;
}

// 將天空、霧、光暗啲（星空）；main.js 喺 updateDayNight 之後叫
const NIGHT_BG = new THREE.Color(0x0b1033);
const NIGHT_TOP = new THREE.Color(0x02030f);
const MOONLIGHT = new THREE.Color(0xa9c1ff);
export function applyBeachSky(scene, skyUniforms, hemi, sun) {
  const k = beach.sky;
  if (k <= 0.001) return;
  scene.background.lerp(NIGHT_BG, k);
  scene.fog.color.copy(scene.background);
  skyUniforms.bottom.value.copy(scene.background);
  skyUniforms.top.value.lerp(NIGHT_TOP, k);
  // 沙灘有自己個大月亮：收埋天空圓頂嘅太陽／月亮；陽光變淡藍色月光
  if (skyUniforms.sunAmt) skyUniforms.sunAmt.value *= 1 - k;
  if (skyUniforms.moonAmt) skyUniforms.moonAmt.value *= 1 - k;
  hemi.intensity *= 1 - 0.45 * k;
  sun.intensity *= 1 - 0.6 * k;
  sun.color.lerp(MOONLIGHT, k);
}

// ================= 秘密結局「THE COLLAB」 =================
// 你行去神秘人度撳 E：佢企起身，原來係另一個 Ranger → 一齊保護動物 → 坐低一齊睇流星雨 → 黑畫面
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function playCollab({ scene, camera, skinId, playMovie, once, shake, play, onDone }) {
  const root = new THREE.Group();
  root.position.x = OFF; // 同沙灘一樣用本地座標
  scene.add(root);
  const s = beach.stranger;
  const S = V(STRANGER.x, 0, STRANGER.z); // 本地（擺嘢用）
  const SW = V(STRANGER.x + OFF, 0, STRANGER.z); // 世界（鏡頭用）
  // 你（用你而家嘅皮膚）
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === skinId) || RANGER_SKINS[0]);
  me.g.scale.setScalar(1.15);
  me.g.position.set(S.x - 3.2, 0, S.z - 2.2);
  me.g.rotation.y = -2.0; // 面向神秘人
  me.g.visible = false; // 第 3 個鏡頭先出現（唔好擋住頭兩個鏡頭）
  root.add(me.g);
  s.label.visible = false;
  const final = [
    '🤝 SECRET ENDING 🤝',
    '<b class="collab">THE COLLAB</b>',
    'Two rangers. One mission.',
    'Together, the endangered animals will always be safe. 🌠',
  ].map((t, i) => `<span class="line" style="animation-delay:${(i * 1.8).toFixed(1)}s">${t}</span>`).join('');
  beach.meteorBoost = 1;
  playMovie(camera, {
    length: 30,
    skipText: 'Click or press any key to keep playing ▶',
    final: { at: 20, html: final },
    shots: [
      [0, 4, { p: V(SW.x - 7, 2.4, SW.z - 5), l: V(SW.x, 1.6, SW.z) }, { p: V(SW.x - 5.5, 2.2, SW.z - 4), l: V(SW.x, 1.6, SW.z) }], // 神秘人背影
      [4, 9, { p: V(SW.x - 1.6, 2.6, SW.z - 2.6), l: V(SW.x, 2.5, SW.z) }, { p: V(SW.x - 1.2, 2.6, SW.z - 2.0), l: V(SW.x, 2.5, SW.z) }], // 佢轉身
      [9, 14, { p: V(SW.x - 1.4, 2.5, SW.z - 5.6), l: V(SW.x - 1.6, 2.1, SW.z - 1.2) }, { p: V(SW.x - 1.2, 2.5, SW.z - 5.0), l: V(SW.x - 1.6, 2.1, SW.z - 1.2) }], // 兩個人
      [14, 20, { p: V(SW.x - 9, 3, SW.z - 1), l: V(SW.x + 30, 22, SW.z - 4) }, { p: V(SW.x - 10, 2.6, SW.z - 1), l: V(SW.x + 30, 30, SW.z - 4) }], // 一齊坐低睇流星雨
    ],
    captions: [
      [0.3, 'Far away on the secret beach, someone was watching the stars...'],
      [14, 'And from that night on, they protected the animals together.'],
    ],
    lines: [
      [1.8, 4, () => s.head, '...', 'ranger'],
      [5, 8.8, () => s.head, 'So YOU are the ranger who saved all the animals!', 'ranger'],
      [9.2, 11.4, () => me.head, 'Who are you?', 'ranger'],
      [11.6, 14, () => s.head, "I'm a ranger from another game! Let's protect them TOGETHER! 🤝", 'ranger'],
    ],
    update(t, dt) {
      // 神秘人：4 秒企起身轉身
      if (t > 4 && once('standUp')) {
        s.g.position.set(S.x - 0.4, 0, S.z - 0.9);
        s.g.rotation.y = 1.13; // 面向你
        for (const leg of s.legs) leg.rotation.x = 0;
        play('pop');
      }
      if (t > 9) me.g.visible = true;
      if (t > 4 && t < 14) s.arms[1].rotation.x = t > 11.6 ? 1.3 + Math.sin(t * 12) * 0.25 : t < 6 ? 2.6 + Math.sin(t * 10) * 0.3 : 0; // 揮手 → 握手
      if (t > 11.6 && t < 14) me.arms[1].rotation.x = 1.3 - Math.sin(t * 12) * 0.25;
      if (t > 11.6 && once('shake')) play('ding');
      // 14 秒：兩個一齊坐喺石上面睇流星雨
      if (t > 14 && once('sit')) {
        sitStranger();
        s.label.visible = false;
        me.g.position.set(S.x, 0.25, S.z - 1.6);
        me.g.rotation.set(0, -Math.PI / 2, 0);
        for (const leg of me.legs) leg.rotation.x = Math.PI / 2;
        me.arms[1].rotation.x = 0;
        beach.meteorBoost = 6; // 流星雨！
        play('magic');
      }
      if (t > 14) {
        me.arms[0].rotation.z = -0.5; // 搭膊頭
        s.arms[0].rotation.z = 0.5;
        if (Math.random() < dt * 2) shake(0.02);
      }
      return null;
    },
    onDone() {
      scene.remove(root);
      beach.meteorBoost = 1;
      for (const arm of s.arms) arm.rotation.z = 0;
      sitStranger();
      onDone?.();
    },
  });
}

// ================= 打贏 Boss 之後：喺秘密沙灘嘅結局（小朋友：打完 Boss 會見到個沙灘） =================
// 動物喺沙灘度玩 → Owner 行過嚟多謝你、俾 $1000 → 黑畫面大字；之後你就喺沙灘度繼續玩
export function playBeachFinale({ scene, camera, playMovie, once, play, owner, standUp, ranger: skinId, animals, reward, onPaid, onDone }) {
  const root = new THREE.Group();
  root.position.x = OFF;
  scene.add(root);
  const W = (x, y, z) => V(x + OFF, y, z); // 本地 → 世界（鏡頭、Owner 用）
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === skinId) || RANGER_SKINS[0]);
  me.g.scale.setScalar(1.2);
  me.g.position.set(38, 0, 81);
  me.g.rotation.y = -Math.PI / 2; // 面向海
  root.add(me.g);
  const pets = animals.map((model, i) => {
    const g = new THREE.Group();
    g.add(model);
    g.position.set(30 + (i % 3) * 2, 0, 76 + Math.floor(i / 3) * 8);
    root.add(g);
    return { g, model, i, goal: V(40 + (i % 3) * 4, 0, 70 + i * 4) };
  });
  const cash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
  cash.visible = false;
  root.add(cash);
  const finalLines = [
    'You saved the endangered animals!',
    `You got paid $${short(reward)}...`,
    "but something's missing...",
    'the pets wanted you to stay here forever,',
    'so you decided to stay with them forever.',
  ].map((t, i) => `<span class="line" style="animation-delay:${(i * 2.1).toFixed(1)}s">${t}</span>`).join('')
    + '<small class="line" style="animation-delay:11s">🐾 THE END 🐾</small>';
  let paid = false;
  const pay = () => {
    if (!paid) {
      paid = true;
      onPaid?.();
    }
  };
  beach.meteorBoost = 3;
  playMovie(camera, {
    length: 33,
    skipText: 'Click or press any key to keep playing ▶',
    final: { at: 19, html: finalLines },
    shots: [
      [0, 6, { p: W(30, 6, 66), l: W(46, 3, 84) }, { p: W(32, 4, 70), l: W(48, 3, 84) }], // 動物跑上沙灘
      [6, 19, { p: W(33.6, 2.9, 80.6), l: W(38.4, 2.4, 80.1) }, { p: W(34.4, 2.7, 80.3), l: W(38.4, 2.4, 80.1) }], // 側面：Owner 同你面對面
    ],
    captions: [
      [0.3, 'Far away from the lab, the animals found a beautiful secret beach... 🏖️'],
      [6, ''],
    ],
    lines: [
      [7.5, 10.5, () => owner.head, 'You did it, Ranger! You saved them ALL! 🎉', 'owner'],
      [10.8, 14, () => owner.head, `Here is $${short(reward)} for being the BEST ranger! 💰`, 'owner'],
      [14.4, 17, () => me.head, 'Thank you! I love it here! 🐾', 'ranger'],
    ],
    update(t, dt) {
      if (once('start')) {
        standUp(owner, 36 + OFF, 75, 0); // Owner 由北邊行過嚟
        owner.label.visible = false;
      }
      for (const p of pets) {
        const d = p.goal.clone().sub(p.g.position);
        d.y = 0;
        const moving = d.length() > 0.3;
        if (moving) {
          p.g.position.add(d.clampLength(0, dt * 4));
          p.g.rotation.y = Math.atan2(-d.x, -d.z);
        } else p.model.position.y = Math.abs(Math.sin(t * 5 + p.i)) * 0.4; // 開心到跳
        p.model.userData.animate?.(t, moving ? 1 : 0);
      }
      // Owner 行埋嚟你隔籬（世界座標）
      const o = owner.g.position;
      const goal = W(38.5, 0, 79.2);
      const d = goal.clone().sub(o);
      d.y = 0;
      if (t > 5 && d.length() > 0.1) {
        o.add(d.clampLength(0, dt * 2.4));
        owner.g.rotation.y = Math.atan2(-d.x, -d.z);
      } else if (t > 5) owner.g.rotation.y = Math.PI; // 面向你（+z）
      if (t > 7.5) me.g.rotation.y = 0; // 你轉身望住 Owner（-z）
      if (t > 7.5 && t < 10.5) owner.arms[1].rotation.x = 2.6 + Math.sin(t * 10) * 0.3; // 揮手
      if (t > 10.8 && t < 13) owner.arms[1].rotation.x = 1.4; // 遞錢
      if (t > 11.5 && t < 16) {
        cash.visible = true;
        const k = Math.min(1, (t - 11.5) / 1.2);
        cash.position.set(38.5, 2.2 + Math.sin(k * Math.PI) * 0.8 + k * 1.4, 79.6 + k * 1.2);
        if (k >= 1 && once('paid')) {
          pay();
          play('coin');
        }
      }
      if (t > 14 && t < 17.5) me.arms.forEach((arm) => (arm.rotation.x = Math.PI)); // 雙手舉高
      if (t > 19 && once('final')) play('magic');
      return null;
    },
    onDone() {
      pay();
      scene.remove(root);
      beach.meteorBoost = 1;
      onDone?.();
    },
  });
}
