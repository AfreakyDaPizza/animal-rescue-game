// 🎃 Halloween 世界嘅「指路燈」：地上發光圈 + 一條光柱 + 上上落落嘅箭咀 + 一盞點光
// 用喺火車站上車位、售票亭、吸塵機舖、Halloween 雕像（小朋友話太黑，搵唔到售票亭）

import * as THREE from 'three';
import { makeSign } from './signs.js';

// 會發光、唔俾霧遮住嘅牌（遠遠都睇到）
export function glowSign(lines, width, height, theme) {
  const s = makeSign(lines, width, height, theme);
  s.material.fog = false;
  s.material.toneMapped = false;
  return s;
}

export function beacon(scene, x, z, { y = 0, color = 0x76ff03, radius = 1.6, light = true, lightY = 4, distance = 22 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.78, radius, 40), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.RingGeometry(radius * 0.3, radius * 0.42, 6), mat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.07;
  g.add(inner);
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.9, 14, 20, 1, true), beamMat);
  beam.position.y = 7;
  g.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false }));
  arrow.rotation.x = Math.PI; // 尖向落
  arrow.position.y = 3.2;
  g.add(arrow);
  let lamp = null;
  if (light) {
    lamp = new THREE.PointLight(color, 9, distance, 1.6);
    lamp.position.y = lightY;
    g.add(lamp);
  }
  scene.add(g);
  const c = new THREE.Color(color);
  return {
    group: g,
    update(t, newColor = null) {
      if (newColor !== null && newColor !== c.getHex()) {
        c.setHex(newColor);
        mat.color.copy(c);
        beamMat.color.copy(c);
        arrow.material.color.copy(c);
        lamp?.color.copy(c);
      }
      arrow.position.y = 3.2 + Math.sin(t * 3) * 0.35;
      arrow.rotation.y = t * 2;
      inner.rotation.z = t * 0.8;
      mat.opacity = 0.65 + Math.sin(t * 4) * 0.2;
      beamMat.opacity = 0.12 + Math.sin(t * 2) * 0.05;
    },
    set visible(v) {
      g.visible = v;
    },
  };
}
