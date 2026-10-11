// 牌同名牌（全部用 canvas 畫字）
// - makeSign：一塊有框、圓角、漸變色嘅牌（兩面都睇到）
// - dynamicSign：內容會變嘅牌（例如倒數）
// - makeLabel：頭頂浮住、永遠面向玩家嘅字（好似 Roblox 頭頂個名）

import * as THREE from 'three';

// 牌嘅顏色主題
export const THEMES = {
  wood: { top: '#a1714f', bottom: '#7a4f33', border: '#4e3220', text: '#fff8e1' },
  green: { top: '#4caf50', bottom: '#2e7d32', border: '#1b5e20', text: '#ffffff' },
  blue: { top: '#42a5f5', bottom: '#1565c0', border: '#0d47a1', text: '#ffffff' },
  orange: { top: '#ffa726', bottom: '#ef6c00', border: '#b33f00', text: '#ffffff' },
  purple: { top: '#ab47bc', bottom: '#6a1b9a', border: '#3c0f5c', text: '#ffffff' },
  red: { top: '#ef5350', bottom: '#c62828', border: '#7f1010', text: '#ffffff' },
  dark: { top: '#455a64', bottom: '#263238', border: '#11191d', text: '#ffffff' },
  pink: { top: '#f06292', bottom: '#ad1457', border: '#5e0a2e', text: '#ffffff' },
  ice: { top: '#81d4fa', bottom: '#0288d1', border: '#01579b', text: '#ffffff' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// lines：[{ text, size（相對牌高，0–1）, color? }]
function paint(canvas, theme, lines) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const pad = H * 0.04;
  const radius = Math.min(W, H) * 0.12;

  // 底色（上光下深）+ 粗邊
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(1, theme.bottom);
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = H * 0.05;
  ctx.strokeStyle = theme.border;
  ctx.stroke();
  // 上半部一條光，似塑膠／油漆反光
  roundRect(ctx, pad * 3, pad * 3, W - pad * 6, (H - pad * 6) * 0.35, radius * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();

  // 字（有陰影）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sizes = lines.map((l) => l.size * H);
  const total = sizes.reduce((a, b) => a + b * 1.2, 0);
  let y = (H - total) / 2;
  lines.forEach((l, i) => {
    const size = sizes[i];
    y += size * 0.6;
    ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(l.text, W / 2 + size * 0.05, y + size * 0.07, W - pad * 8);
    ctx.fillStyle = l.color || theme.text;
    ctx.fillText(l.text, W / 2, y, W - pad * 8);
    y += size * 0.6;
  });
}

function signMesh(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  );
  return { mesh, canvas, texture };
}

// 一塊靜態牌。text 可以係一句字，或者 lines array
export function makeSign(text, width, height, theme = THEMES.wood) {
  const { mesh, canvas } = signMesh(width, height);
  const lines = typeof text === 'string' ? [{ text, size: 0.5 }] : text;
  paint(canvas, theme, lines);
  return mesh;
}

// 內容會變嘅牌：draw(theme, lines) 有變先重畫
export function dynamicSign(width, height) {
  const { mesh, canvas, texture } = signMesh(width, height);
  let last = '';
  function draw(theme, lines) {
    const key = JSON.stringify([theme, lines]);
    if (key === last) return;
    last = key;
    paint(canvas, theme, lines);
    texture.needsUpdate = true;
  }
  return { mesh, draw };
}

// 一塊牌連兩支方柱（擺喺地上）
export function signOnPosts(sign, width, height, y) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, y + height / 2, 0.22), wood);
    post.position.set(side * (width / 2 - 0.15), (y + height / 2) / 2, -0.05);
    post.castShadow = true;
    group.add(post);
  }
  sign.position.y = y;
  group.add(sign);
  return group;
}

// ---- 頭頂字（Sprite：永遠面向玩家）----
// lines：[{ text, color }]，第一行大啲
export function makeLabel(lines, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64 * lines.length + 16;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set(3.2 * scale, (3.2 * scale * canvas.height) / canvas.width, 1);
  sprite.renderOrder = 10;
  let last = '';
  sprite.userData.setLines = (newLines) => {
    const key = JSON.stringify(newLines);
    if (key === last) return;
    last = key;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    newLines.forEach((l, i) => {
      const size = i === 0 ? 46 : 40;
      ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const y = 40 + i * 64;
      ctx.strokeText(l.text, canvas.width / 2, y, canvas.width - 20);
      ctx.fillStyle = l.color || '#ffffff';
      ctx.fillText(l.text, canvas.width / 2, y, canvas.width - 20);
    });
    texture.needsUpdate = true;
  };
  sprite.userData.setLines(lines);
  return sprite;
}
