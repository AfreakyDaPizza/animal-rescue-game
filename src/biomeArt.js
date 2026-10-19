// 新版 Biome 4（Arctic Meltdown）同 Biome 5（Smuggler's Compound）嘅美術
// Issue #2：小朋友話舊版「very very ugly」→ 重做紋理（texture）同設計。
// 紋理全部用 canvas 即場畫（像素風，同成個遊戲嘅方塊風格夾）；裝飾放兩邊，中間條路（|x| < 3）留空。
// scene：唔會郁嘅嘢（之後焊埋做一大件）；live：會郁嘅嘢（冰塊浮、極光、雪、探射燈）

import * as THREE from 'three';

// ---------- 細工具 ----------
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; // 像素風：近睇唔會矇
  t.repeat.set(repeat, repeat);
  return t;
}
const hex = (c) => '#' + new THREE.Color(c).getHexString();
function shade(c, l) {
  const col = new THREE.Color(c);
  col.offsetHSL(0, 0, l);
  return '#' + col.getHexString();
}
// 一格格噪點（像素風底色）
function pixelNoise(ctx, size, base, amount, px = 4, rand = Math.random) {
  for (let y = 0; y < size; y += px)
    for (let x = 0; x < size; x += px) {
      ctx.fillStyle = shade(base, (rand() - 0.5) * amount);
      ctx.fillRect(x, y, px, px);
    }
}

// 方塊嘅 UV 跟實際尺寸（每 unit 米重複一次紋理）→ 大細唔同嘅箱用同一份物料都唔會拉長
function tiledBox(w, h, d, unit = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // 面嘅次序：+x、-x、+y、-y、+z、-z；每面 4 點
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / unit, (uv.getY(i) * dims[f][1]) / unit);
    }
  return g;
}

const matCache = new Map();
function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 兩邊揀位（避開中間條路同牆邊嘅大建築）
function sideSpot(rand, rect, inner = 4, outer = 6) {
  const side = rand() < 0.5 ? -1 : 1;
  const half = (rect.maxX - rect.minX) / 2;
  return [side * (inner + rand() * (half - outer - inner)), rect.minZ + 3 + rand() * (rect.maxZ - rect.minZ - 6)];
}

// =====================================================================
// 地板紋理（world.js addFloor 用）
// =====================================================================
export function biomeFloorTexture(i, w, d) {
  if (i === 3) return snowFloorTexture(w, d);
  if (i === 4) return asphaltTexture(w, d);
  return null;
}

// 雪地：白色帶淺藍陰影、閃閃雪粒、少少腳印
function snowFloorTexture(w, d) {
  const t = canvasTex(128, (ctx, s) => {
    pixelNoise(ctx, s, 0xf3f8fc, 0.05);
    // 淺藍色一笪笪（雪堆陰影）
    for (let n = 0; n < 9; n++) {
      ctx.fillStyle = 'rgba(150,190,225,0.18)';
      const x = Math.random() * s, y = Math.random() * s, r = 8 + Math.random() * 14;
      for (let k = 0; k < 6; k++) ctx.fillRect(Math.floor((x + (Math.random() - 0.5) * r) / 4) * 4, Math.floor((y + (Math.random() - 0.5) * r) / 4) * 4, 8, 4);
    }
    // 閃閃（白點同淺藍點）
    for (let n = 0; n < 40; n++) {
      ctx.fillStyle = n % 3 ? '#ffffff' : '#bfe6ff';
      ctx.fillRect(Math.floor(Math.random() * 64) * 2, Math.floor(Math.random() * 64) * 2, 2, 2);
    }
  });
  t.repeat.set(w / 6, d / 6);
  return t;
}

// 瀝青地：深灰顆粒、裂紋、油漬
function asphaltTexture(w, d) {
  const t = canvasTex(128, (ctx, s) => {
    pixelNoise(ctx, s, 0x3d3f44, 0.07, 2);
    // 油漬（深色、有少少彩虹邊）
    for (let n = 0; n < 3; n++) {
      const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 10;
      ctx.fillStyle = 'rgba(15,15,20,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,90,200,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 裂紋
    ctx.strokeStyle = 'rgba(15,15,18,0.8)';
    ctx.lineWidth = 1;
    for (let n = 0; n < 4; n++) {
      let x = Math.random() * s, y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 16;
        y += (Math.random() - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  t.repeat.set(w / 5, d / 5);
  return t;
}

// =====================================================================
// 共用紋理
// =====================================================================
// 冰：淺藍、有白色光紋同深藍裂紋
const iceTex = () =>
  canvasTex(64, (ctx, s) => {
    pixelNoise(ctx, s, 0xa9dcf5, 0.08);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let n = 0; n < 5; n++) ctx.fillRect(Math.random() * s, Math.random() * s, 2, 10 + Math.random() * 14);
    ctx.strokeStyle = 'rgba(40,110,170,0.6)';
    ctx.lineWidth = 1;
    for (let n = 0; n < 3; n++) {
      let x = Math.random() * s, y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) ctx.lineTo((x += (Math.random() - 0.5) * 14), (y += Math.random() * 10));
      ctx.stroke();
    }
  });
// 雪磚（雪屋用）
const snowBrickTex = () =>
  canvasTex(64, (ctx, s) => {
    ctx.fillStyle = '#c9dbe8';
    ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < 4; row++)
      for (let col = -1; col < 3; col++) {
        ctx.fillStyle = shade(0xf4f9fd, (Math.random() - 0.5) * 0.04);
        ctx.fillRect(col * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
      }
  });
// 鐵皮（坑紋直條）→ 貨櫃、貨倉；顏色靠 material.color 染
const corrugatedTex = () =>
  canvasTex(64, (ctx, s) => {
    for (let x = 0; x < s; x += 8) {
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(x, 0, 4, s);
      ctx.fillStyle = '#c4c4c4';
      ctx.fillRect(x + 4, 0, 2, s);
      ctx.fillStyle = '#9a9a9a';
      ctx.fillRect(x + 6, 0, 2, s);
    }
    // 少少鏽
    for (let n = 0; n < 12; n++) {
      ctx.fillStyle = 'rgba(150,80,30,0.25)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3 + Math.random() * 6);
    }
  });
// 木箱：木板 + 深色框 + 交叉木條
const crateTex = (stamp) =>
  canvasTex(128, (ctx, s) => {
    for (let y = 0; y < s; y += 16) {
      ctx.fillStyle = shade(0xb07c4f, (Math.random() - 0.5) * 0.08);
      ctx.fillRect(0, y, s, 15);
      ctx.fillStyle = 'rgba(90,55,30,0.5)';
      for (let k = 0; k < 5; k++) ctx.fillRect(Math.random() * s, y + 4 + Math.random() * 8, 10 + Math.random() * 20, 1);
    }
    ctx.fillStyle = '#6d4426';
    ctx.fillRect(0, 0, s, 10);
    ctx.fillRect(0, s - 10, s, 10);
    ctx.fillRect(0, 0, 10, s);
    ctx.fillRect(s - 10, 0, 10, s);
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-90, -5, 180, 10);
    ctx.restore();
    if (stamp) {
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(-0.25);
      ctx.strokeStyle = ctx.fillStyle = 'rgba(200,30,30,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-46, -14, 92, 28);
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stamp, 0, 1);
      ctx.restore();
    }
  });
// 黃黑警告斜紋
const hazardTex = () =>
  canvasTex(64, (ctx, s) => {
    ctx.fillStyle = '#fdd835';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#212121';
    for (let k = -s; k < s * 2; k += 16) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 8, 0);
      ctx.lineTo(k + 8 - s, s);
      ctx.lineTo(k - s, s);
      ctx.fill();
    }
  });
// 鐵絲網（菱形格，透明）
const chainLinkTex = () => {
  const t = canvasTex(32, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = '#b0b6bb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, s / 2);
    ctx.lineTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.closePath();
    ctx.stroke();
  });
  t.magFilter = THREE.LinearFilter;
  return t;
};
// 一塊寫字嘅招牌
function signPlane(text, w, h, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, c.width - 8, c.height - 8);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(c.height * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
}

// =====================================================================
// Biome 4：Arctic Meltdown（新版）
// 冰川懸崖、融冰海（浮冰）、雪松、雪屋、研究站、北極光
// =====================================================================
export function arcticV2(scene, rect, rand, live) {
  const half = (rect.maxX - rect.minX) / 2;
  const len = rect.maxZ - rect.minZ;
  const cz = (rect.minZ + rect.maxZ) / 2;
  const ice = mat('ice', () => new THREE.MeshStandardMaterial({ map: iceTex(), roughness: 0.25, metalness: 0.05 }));
  const snow = mat('snowcap', () => new THREE.MeshStandardMaterial({ map: canvasTex(32, (c, s) => pixelNoise(c, s, 0xffffff, 0.04)) }));
  const deepIce = mat('deepice', () => new THREE.MeshStandardMaterial({ map: iceTex(), color: 0x7fb8e0, roughness: 0.3 }));

  // 1) 兩邊冰川懸崖（遮住磚牆）：一級級高低唔同嘅冰塊，頂鋪雪
  for (const side of [-1, 1]) {
    for (let z = rect.maxZ - 2; z > rect.minZ + 1; ) {
      const d = 3 + rand() * 4;
      const h = 4 + rand() * 6;
      const w = 2.5 + rand() * 2;
      const x = side * (half - w / 2 + 0.3);
      add(scene, tiledBox(w, h, d, 2.5), rand() < 0.3 ? deepIce : ice, x, h / 2, z - d / 2);
      add(scene, tiledBox(w + 0.3, 0.5, d + 0.2, 2), snow, x, h + 0.2, z - d / 2);
      // 前面多一級細啲嘅冰（似階梯）
      if (rand() < 0.6) {
        const h2 = h * (0.35 + rand() * 0.3);
        add(scene, tiledBox(1.6, h2, d * 0.7, 2.5), ice, x - side * (w / 2 + 0.8), h2 / 2, z - d / 2);
        add(scene, tiledBox(1.8, 0.35, d * 0.7 + 0.2, 2), snow, x - side * (w / 2 + 0.8), h2 + 0.15, z - d / 2);
      }
      // 冰柱（由懸崖頂吊落嚟）
      for (let k = 0; k < 3; k++) {
        const ic = add(scene, new THREE.ConeGeometry(0.15, 0.8 + rand() * 0.8, 4), ice, x - side * (w / 2), h - 0.5, z - rand() * d);
        ic.rotation.x = Math.PI;
      }
      z -= d;
    }
  }

  // 2) 融冰海：兩邊各一個大水池，有浮冰上上落落
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e6fb8, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.2 });
  const floes = [];
  const pools = [
    { x: -11, z: rect.maxZ - len * 0.3, w: 9, d: 12 },
    { x: 11, z: rect.maxZ - len * 0.68, w: 9, d: 14 },
  ];
  for (const p of pools) {
    const water = add(live, new THREE.BoxGeometry(p.w, 0.1, p.d), waterMat, p.x, 0.04, p.z, false);
    water.receiveShadow = true;
    // 水邊一圈薄冰
    add(scene, tiledBox(p.w + 0.6, 0.12, 0.4, 2), ice, p.x, 0.06, p.z + p.d / 2 + 0.2, false);
    add(scene, tiledBox(p.w + 0.6, 0.12, 0.4, 2), ice, p.x, 0.06, p.z - p.d / 2 - 0.2, false);
    for (let n = 0; n < 5; n++) {
      const g = new THREE.Group();
      const fw = 1 + rand() * 1.6, fd = 1 + rand() * 1.6;
      add(g, tiledBox(fw, 0.35, fd, 2), ice, 0, 0, 0);
      add(g, tiledBox(fw * 0.9, 0.12, fd * 0.9, 2), snow, 0, 0.22, 0);
      g.position.set(p.x + (rand() - 0.5) * (p.w - 2), 0.12, p.z + (rand() - 0.5) * (p.d - 2));
      g.rotation.y = rand() * 3;
      live.add(g);
      floes.push({ g, y: 0.12, phase: rand() * 6, spin: (rand() - 0.5) * 0.1 });
    }
  }

  // 3) 雪松（每層葉頂有雪）
  const leaf = mat('arcticleaf', () => new THREE.MeshStandardMaterial({ color: 0x2f5d3a }));
  const trunk = mat('arctictrunk', () => new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
  for (let n = 0; n < 14; n++) {
    const [x, z] = sideSpot(rand, rect, 4.5, 6);
    if (pools.some((p) => Math.abs(x - p.x) < p.w / 2 + 1 && Math.abs(z - p.z) < p.d / 2 + 1)) continue;
    const s = 0.8 + rand() * 0.6;
    add(scene, new THREE.BoxGeometry(0.4 * s, 1.4 * s, 0.4 * s), trunk, x, 0.7 * s, z);
    [[2.4, 1.6], [1.8, 2.5], [1.2, 3.3], [0.6, 4.0]].forEach(([w, y], i) => {
      add(scene, new THREE.BoxGeometry(w * s, 0.8 * s, w * s), leaf, x, y * s, z).rotation.y = i * 0.5;
      add(scene, new THREE.BoxGeometry(w * s * 0.85, 0.2 * s, w * s * 0.85), snow, x, (y + 0.45) * s, z).rotation.y = i * 0.5;
    });
  }

  // 4) 雪堆
  const drift = mat('drift', () => new THREE.MeshStandardMaterial({ color: 0xf7fbff, flatShading: true }));
  for (let n = 0; n < 22; n++) {
    const [x, z] = sideSpot(rand, rect, 3.5, 5);
    const m = add(scene, new THREE.IcosahedronGeometry(0.7 + rand() * 0.8, 0), drift, x, 0, z, false);
    m.scale.set(1.4, 0.45, 1);
    m.rotation.y = rand() * 3;
  }

  // 5) 雪屋（雪磚圓頂）＋ 研究站（紅色小屋、天線、旗）
  const brick = mat('snowbrick', () => new THREE.MeshStandardMaterial({ map: snowBrickTex() }));
  const igloo = { x: -9, z: rect.maxZ - len * 0.62 };
  // 圓頂（半個波）＋ 向路嘅入口隧道 + 黑色門口
  const domeGeo = new THREE.SphereGeometry(2.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const uvd = domeGeo.attributes.uv;
  for (let k = 0; k < uvd.count; k++) uvd.setXY(k, uvd.getX(k) * 8, uvd.getY(k) * 3); // 雪磚唔好拉到太闊
  add(scene, domeGeo, brick, igloo.x, 0, igloo.z);
  const tunnel = add(scene, new THREE.CylinderGeometry(1.1, 1.1, 1.8, 14, 1, false, 0, Math.PI), brick, igloo.x + 2.6, 0, igloo.z);
  tunnel.rotation.set(0, 0, Math.PI / 2); // 半圓柱橫放（軸向 x），圓拱向上，開口向 +x（向路）
  const hole = add(scene, new THREE.CircleGeometry(0.85, 14, 0, Math.PI), mat('igloohole', () => new THREE.MeshBasicMaterial({ color: 0x1b2a38 })), igloo.x + 3.52, 0.01, igloo.z, false);
  hole.rotation.y = Math.PI / 2;
  // 研究站
  const st = { x: 9.5, z: rect.maxZ - len * 0.28 };
  const red = mat('stationred', () => new THREE.MeshStandardMaterial({ map: corrugatedTex(), color: 0xd84343 }));
  add(scene, tiledBox(5, 3, 3.5, 2), red, st.x, 1.6, st.z);
  add(scene, new THREE.BoxGeometry(5.4, 0.25, 3.9), snow, st.x, 3.2, st.z);
  add(scene, new THREE.BoxGeometry(0.15, 2.5, 0.15), mat('pole', () => new THREE.MeshStandardMaterial({ color: 0x9e9e9e })), st.x + 2, 4.4, st.z);
  add(scene, new THREE.BoxGeometry(0.9, 0.08, 0.08), mat('pole', () => new THREE.MeshStandardMaterial({ color: 0x9e9e9e })), st.x + 2, 5.2, st.z);
  const winMat = mat('stationwin', () => new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xffe082, emissiveIntensity: 0.8 }));
  for (const dx of [-1.3, 0.2]) add(scene, new THREE.BoxGeometry(0.9, 0.7, 0.05), winMat, st.x + dx, 1.9, st.z + 1.78, false);
  add(scene, new THREE.BoxGeometry(0.8, 1.7, 0.05), mat('door', () => new THREE.MeshStandardMaterial({ color: 0x37474f })), st.x + 1.6, 0.95, st.z + 1.78, false);
  const sign = signPlane('ARCTIC RESEARCH', 3.2, 0.6, '#0d47a1', '#ffffff');
  sign.position.set(st.x, 2.85, st.z + 1.8);
  scene.add(sign);

  // 6) 北極光：幾條會飄嘅綠紫光帶（加法混色、唔寫深度）
  const auroraMat = (c1, c2) => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.35, c2);
    gr.addColorStop(0.8, c1);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 4, 64);
    const t = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  };
  const ribbons = [];
  [['rgba(80,255,170,1)', 'rgba(120,80,255,1)', 26, -6], ['rgba(60,230,255,1)', 'rgba(200,90,255,1)', 30, 6], ['rgba(110,255,140,1)', 'rgba(80,160,255,1)', 23, 0]].forEach(([c1, c2, y, dx], k) => {
    const geo = new THREE.PlaneGeometry(len * 0.9, 9, 40, 1);
    const m = new THREE.Mesh(geo, auroraMat(c1, c2));
    m.rotation.y = Math.PI / 2;
    m.position.set(dx, y, cz);
    live.add(m);
    ribbons.push({ m, base: geo.attributes.position.array.slice(), k });
  });

  // 7) 落雪（大粒啲）
  const count = 900;
  const pos = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    pos[n * 3] = rect.minX + rand() * (rect.maxX - rect.minX);
    pos[n * 3 + 1] = rand() * 16;
    pos[n * 3 + 2] = rect.minZ + rand() * len;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  live.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09 })));

  return (dt, t) => {
    for (const f of floes) {
      f.g.position.y = f.y + Math.sin(t * 1.2 + f.phase) * 0.06;
      f.g.rotation.z = Math.sin(t * 0.9 + f.phase) * 0.04;
      f.g.rotation.y += f.spin * dt;
    }
    for (const r of ribbons) {
      const a = r.m.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = r.base[i * 3];
        a.array[i * 3 + 2] = Math.sin(x * 0.12 + t * 0.5 + r.k) * 3 + Math.sin(x * 0.05 - t * 0.3) * 2;
      }
      a.needsUpdate = true;
      r.m.material.opacity = 0.4 + Math.sin(t * 0.7 + r.k * 2) * 0.15;
    }
    for (let n = 0; n < count; n++) {
      pos[n * 3 + 1] -= dt * 1.4;
      pos[n * 3] += Math.sin(t + n) * dt * 0.25;
      if (pos[n * 3 + 1] < 0) pos[n * 3 + 1] = 16;
    }
    snowGeo.attributes.position.needsUpdate = true;
  };
}

// =====================================================================
// Biome 5：Smuggler's Compound（新版）
// 貨倉、疊起嘅貨櫃、鐵絲網＋鐵蒺藜、木箱（FRAGILE）、打開咗嘅空籠（動物已經救走）、警告油桶、瞭望塔＋探射燈
// =====================================================================
export function smugglersV2(scene, rect, rand, live) {
  const half = (rect.maxX - rect.minX) / 2;
  const len = rect.maxZ - rect.minZ;
  const cz = (rect.minZ + rect.maxZ) / 2;
  const metal = (c) => mat('corr' + c, () => new THREE.MeshStandardMaterial({ map: corrugatedTex(), color: c, metalness: 0.3, roughness: 0.6 }));
  const dark = mat('darkmetal', () => new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5, roughness: 0.5 }));
  const hazard = mat('hazard', () => new THREE.MeshStandardMaterial({ map: hazardTex() }));

  // 1) 路中間黃色虛線 + 兩邊白線
  const yellow = mat('roadyellow', () => new THREE.MeshBasicMaterial({ color: 0xffd54f }));
  const white = mat('roadwhite', () => new THREE.MeshBasicMaterial({ color: 0xe0e0e0 }));
  for (let z = rect.maxZ - 2; z > rect.minZ + 1; z -= 4) add(scene, new THREE.BoxGeometry(0.25, 0.02, 2), yellow, 0, 0.01, z - 1, false);
  for (const x of [-3.2, 3.2]) add(scene, new THREE.BoxGeometry(0.15, 0.02, len - 2), white, x, 0.01, cz, false);

  // 2) 兩邊貨倉（大鐵皮屋，捲閘有警告斜紋，招牌）
  const wallColors = [0x546e7a, 0x8d6e63, 0x607d8b];
  let wi = 0;
  for (const side of [-1, 1]) {
    for (let z = rect.maxZ - 4; z > rect.minZ + 8; z -= 22) {
      const w = 6, h = 6.5, d = 14;
      const x = side * (half - w / 2 - 0.2);
      add(scene, tiledBox(w, h, d, 2), metal(wallColors[wi++ % 3]), x, h / 2, z - d / 2);
      add(scene, tiledBox(w + 0.6, 0.4, d + 0.6, 2), dark, x, h + 0.2, z - d / 2); // 屋頂邊
      // 捲閘（向路）
      const doorX = x - side * (w / 2 + 0.03);
      const door = add(scene, tiledBox(0.05, 3.6, 4.5, 1.5), metal(0x9e9e9e), doorX, 1.8, z - d / 2, false);
      door.receiveShadow = true;
      add(scene, tiledBox(0.08, 0.4, 4.9, 1), hazard, doorX, 3.8, z - d / 2, false);
      const sign = signPlane(side < 0 ? 'WAREHOUSE A' : 'WAREHOUSE B', 3.4, 0.7, '#263238', '#ffca28');
      sign.position.set(doorX - side * 0.02, 5.2, z - d / 2);
      sign.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(sign);
      // 牆上燈（黃色、發光）
      add(scene, new THREE.BoxGeometry(0.3, 0.3, 0.3), mat('wlamp', () => new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd54f, emissiveIntensity: 1.6 })), doorX - side * 0.15, 4.5, z - d / 2 - 3, false);
    }
  }

  // 3) 貨櫃（2 層疊，唔同顏色，有門把）
  const contColors = [0xc62828, 0x1565c0, 0x2e7d32, 0xef6c00, 0x6a1b9a];
  const spots = [[-8, rect.maxZ - 22], [8.5, rect.maxZ - 9], [-8.5, rect.maxZ - 46], [8, rect.maxZ - 38]];
  for (const [x, z] of spots) {
    const levels = rand() < 0.6 ? 2 : 1;
    for (let lv = 0; lv < levels; lv++) {
      const g = add(scene, tiledBox(2.4, 2.4, 6, 1.6), metal(contColors[Math.floor(rand() * contColors.length)]), x + (lv ? (rand() - 0.5) * 0.4 : 0), 1.2 + lv * 2.45, z, true);
      g.rotation.y = (rand() - 0.5) * 0.15;
      for (const dx of [-0.5, 0.5]) add(scene, new THREE.BoxGeometry(0.06, 2, 0.06), dark, x + dx, 1.2 + lv * 2.45, z + 3.02, false);
    }
  }

  // 4) 木箱（有 FRAGILE／THIS SIDE UP 印）
  const crateA = mat('crateA', () => new THREE.MeshStandardMaterial({ map: crateTex('FRAGILE') }));
  const crateB = mat('crateB', () => new THREE.MeshStandardMaterial({ map: crateTex('') }));
  for (let n = 0; n < 16; n++) {
    const [x, z] = sideSpot(rand, rect, 4, 7.5);
    const s = 0.9 + rand() * 0.5;
    const c = add(scene, new THREE.BoxGeometry(s, s, s), rand() < 0.5 ? crateA : crateB, x, s / 2, z);
    c.rotation.y = rand() * 0.6;
    if (rand() < 0.4) {
      const t = add(scene, new THREE.BoxGeometry(s * 0.75, s * 0.75, s * 0.75), crateB, x + 0.1, s + s * 0.375, z);
      t.rotation.y = rand();
    }
  }

  // 5) 打開咗嘅空籠（動物已經俾你救走）
  const bar = mat('cagebar', () => new THREE.MeshStandardMaterial({ color: 0x9aa4ab, metalness: 0.7, roughness: 0.35 }));
  for (let n = 0; n < 6; n++) {
    const [x, z] = sideSpot(rand, rect, 4, 7.5);
    const g = new THREE.Group();
    const s = 1.3;
    add(g, new THREE.BoxGeometry(s, 0.08, s), dark, 0, 0.04, 0);
    add(g, new THREE.BoxGeometry(s, 0.08, s), dark, 0, s, 0);
    for (let k = 0; k <= 4; k++) {
      const p = -s / 2 + (k * s) / 4;
      add(g, new THREE.BoxGeometry(0.05, s, 0.05), bar, p, s / 2, -s / 2);
      add(g, new THREE.BoxGeometry(0.05, s, 0.05), bar, -s / 2, s / 2, p);
      add(g, new THREE.BoxGeometry(0.05, s, 0.05), bar, s / 2, s / 2, p);
    }
    // 門打開咗（轉 100 度）
    const door = new THREE.Group();
    for (let k = 0; k <= 4; k++) add(door, new THREE.BoxGeometry(0.05, s, 0.05), bar, (k * s) / 4, s / 2, 0);
    door.position.set(-s / 2, 0, s / 2);
    door.rotation.y = -1.7;
    g.add(door);
    g.position.set(x, 0, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
  }

  // 6) 警告斜紋油桶
  for (let n = 0; n < 10; n++) {
    const [x, z] = sideSpot(rand, rect, 4, 7.5);
    add(scene, new THREE.CylinderGeometry(0.35, 0.35, 1, 12), rand() < 0.5 ? hazard : metal(0x1565c0), x, 0.5, z);
  }

  // 7) 鐵絲網（真菱形網）+ 頂上鐵蒺藜（貼住兩邊牆，喺貨倉後面都睇到）
  const link = chainLinkTex();
  link.repeat.set(len / 0.5, 3.0 / 0.5);
  const fenceMat = new THREE.MeshStandardMaterial({ map: link, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5 });
  const wire = mat('barbed', () => new THREE.MeshStandardMaterial({ color: 0x8d969c, metalness: 0.8 }));
  for (const side of [-1, 1]) {
    const x = side * (half - 0.25);
    const fence = add(live, new THREE.PlaneGeometry(len, 3), fenceMat, x, 5, cz, false);
    fence.rotation.y = Math.PI / 2;
    for (let z = rect.maxZ - 1; z > rect.minZ; z -= 1.2) {
      const coil = add(scene, new THREE.TorusGeometry(0.3, 0.025, 4, 10), wire, x, 6.8, z, false);
      coil.rotation.y = Math.PI / 2;
    }
    for (let z = rect.maxZ - 0.5; z > rect.minZ; z -= 4) {
      add(scene, new THREE.BoxGeometry(0.12, 3.4, 0.12), dark, x, 5.1, z);
      // 柱頂斜臂（擺鐵蒺藜嗰種）+ 黃黑警告帶（小朋友 2026-10-19：圍欄要型啲）
      const arm = add(scene, new THREE.BoxGeometry(0.08, 0.7, 0.08), dark, x - side * 0.18, 6.85, z, false);
      arm.rotation.z = side * 0.6;
      add(scene, new THREE.BoxGeometry(0.16, 0.35, 0.16), hazard, x, 3.6, z, false);
    }
    // 頂、底兩條鐵管（圍欄唔再係塊浮喺度嘅網）
    for (const y of [3.55, 6.5]) {
      const pipe = add(scene, new THREE.CylinderGeometry(0.05, 0.05, len, 6), wire, x, y, cz, false);
      pipe.rotation.x = Math.PI / 2;
    }
  }

  // 8) 瞭望塔（四隻腳 + 細屋 + 探射燈喺頂轉）
  const tw = { x: -12, z: cz - 6 };
  const wood = mat('towerwood', () => new THREE.MeshStandardMaterial({ map: crateTex(''), color: 0x9e8b7a }));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(scene, new THREE.BoxGeometry(0.25, 7, 0.25), wood, tw.x + dx, 3.5, tw.z + dz);
  add(scene, tiledBox(2.8, 0.3, 2.8, 1.4), wood, tw.x, 7, tw.z);
  add(scene, tiledBox(2.8, 1.0, 2.8, 1.4), metal(0x455a64), tw.x, 7.65, tw.z);
  add(scene, new THREE.BoxGeometry(3.2, 0.2, 3.2), dark, tw.x, 9.3, tw.z);
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) add(scene, new THREE.BoxGeometry(0.15, 1.1, 0.15), dark, tw.x + dx, 8.7, tw.z + dz);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3.5, 16, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.geometry.translate(0, -8, 0);
  const pivot = new THREE.Group();
  pivot.position.set(tw.x, 8.6, tw.z);
  beam.rotation.x = 0.85;
  pivot.add(beam);
  add(pivot, new THREE.CylinderGeometry(0.3, 0.4, 0.5, 12), mat('lamphead', () => new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff176, emissiveIntensity: 2 })), 0, 0, 0, false);
  live.add(pivot);

  // 9) 射燈柱（兩邊）
  const lampMat = mat('flood', () => new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe082, emissiveIntensity: 1.8 }));
  for (let z = rect.maxZ - 12, side = 1; z > rect.minZ + 4; z -= 16, side = -side) {
    const x = side * 6.5;
    add(scene, new THREE.CylinderGeometry(0.1, 0.12, 6, 8), dark, x, 3, z);
    add(scene, new THREE.BoxGeometry(0.9, 0.35, 0.5), lampMat, x - side * 0.3, 6.1, z, false);
  }

  return (dt, t) => {
    pivot.rotation.y = t * 0.5;
  };
}
