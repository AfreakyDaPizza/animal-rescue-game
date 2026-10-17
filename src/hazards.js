// 障礙物：喺生態區打橫郁嚟郁去，撞到就要答問題
// 每個生態區有唔同嘅污染／危險

import * as THREE from 'three';
import { biomeRect, groundAt } from './world.js';
import { MOUNTAIN, SUMMIT } from './biomes.js';
import { HAZARD_COUNT, HAZARD_SPEED } from './data/balance.js';

const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, ...extra });

function mesh(group, geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  group.add(m);
  return m;
}

// 每款障礙物：名、樣、碰撞範圍（半闊 hx、半深 hz）、會唔會郁
const KINDS = {
  log: {
    title: '🪵 A rolling log hit you!', hx: 0.6, hz: 1.4,
    build(g) {
      const log = mesh(g, new THREE.CylinderGeometry(0.55, 0.55, 2.8, 12), mat(0x795548), 0, 0.55, 0);
      log.rotation.x = Math.PI / 2;
      for (const z of [-1.41, 1.41]) mesh(g, new THREE.CircleGeometry(0.5, 12), mat(0xd7a86e), 0, 0.55, z).rotation.y = z > 0 ? 0 : Math.PI;
      return (dt, h) => (log.rotation.y -= (h.dir * h.speed * dt) / 0.55);
    },
  },
  smoke: {
    title: '💨 You breathed polluted smoke!', hx: 1.3, hz: 1.3,
    build(g) {
      const puffs = [];
      for (let i = 0; i < 6; i++) {
        const p = mesh(g, new THREE.SphereGeometry(0.7, 12, 8), mat(0x616161, { transparent: true, opacity: 0.75 }), (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6);
        p.castShadow = false;
        puffs.push({ p, phase: Math.random() * 6 });
      }
      return (dt, h, t) => puffs.forEach(({ p, phase }) => p.scale.setScalar(1 + Math.sin(t * 2 + phase) * 0.2));
    },
  },
  trash: {
    title: '🗑️ Floating trash hit you!', hx: 0.8, hz: 0.8,
    build(g) {
      const bag = mesh(g, new THREE.SphereGeometry(0.55, 12, 8), mat(0x263238), 0, 0.6, 0);
      bag.scale.set(1, 1.2, 1);
      mesh(g, new THREE.ConeGeometry(0.2, 0.35, 8), mat(0x263238), 0, 1.3, 0);
      const bottle = mesh(g, new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), mat(0x81d4fa, { transparent: true, opacity: 0.8 }), 0.6, 0.4, 0.3);
      bottle.rotation.z = 1.2;
      mesh(g, new THREE.TorusGeometry(0.25, 0.05, 6, 16), mat(0xffffff), -0.5, 0.3, -0.4).rotation.x = 1.4;
      return (dt, h, t) => (bag.rotation.y = t);
    },
  },
  oil: {
    title: '🛢️ You slipped in an oil spill!', hx: 1.4, hz: 1.4,
    build(g) {
      const blob = mesh(g, new THREE.CylinderGeometry(1.5, 1.5, 0.12, 24), mat(0x0d0d12, { roughness: 0.05, metalness: 0.8 }), 0, 0.42, 0);
      for (let i = 0; i < 4; i++) mesh(g, new THREE.SphereGeometry(0.35, 10, 8), mat(0x0d0d12, { roughness: 0.05, metalness: 0.8 }), Math.cos(i * 1.6) * 0.8, 0.5, Math.sin(i * 1.6) * 0.8).scale.y = 0.4;
      return (dt, h, t) => blob.scale.set(1 + Math.sin(t * 1.5) * 0.08, 1, 1 + Math.cos(t * 1.3) * 0.08);
    },
  },
  net: {
    title: "🕸️ A poacher's net caught you!", hx: 0.5, hz: 1.6,
    build(g) {
      for (const z of [-1.6, 1.6]) mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat(0x5d4037), 0, 1.3, z);
      const net = mesh(g, new THREE.PlaneGeometry(3.2, 2.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffcc80, wireframe: true }), 0, 1.3, 0);
      net.rotation.y = Math.PI / 2;
      return (dt, h, t) => (net.rotation.z = Math.sin(t * 3) * 0.08);
    },
  },
  trap: {
    title: '⚠️ You stepped on a trap!', hx: 0.8, hz: 0.8, still: true,
    build(g) {
      mesh(g, new THREE.TorusGeometry(0.6, 0.08, 8, 20), mat(0x9e9e9e, { metalness: 0.8 }), 0, 0.1, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        mesh(g, new THREE.ConeGeometry(0.06, 0.3, 4), mat(0xbdbdbd, { metalness: 0.8 }), Math.cos(a) * 0.55, 0.25, Math.sin(a) * 0.55);
      }
      const light = mesh(g, new THREE.SphereGeometry(0.1, 8, 6), mat(0xff1744, { emissive: 0xff1744 }), 0, 0.2, 0);
      return (dt, h, t) => (light.visible = Math.sin(t * 8) > 0);
    },
  },
  barrel: {
    title: '🛢️ A rolling oil barrel hit you!', hx: 0.6, hz: 0.8,
    build(g) {
      const barrel = new THREE.Group();
      g.add(barrel);
      barrel.position.y = 0.5;
      mesh(barrel, new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16), mat(0x212121, { metalness: 0.5 }), 0, 0, 0);
      mesh(barrel, new THREE.CylinderGeometry(0.52, 0.52, 0.2, 16), mat(0xffd600), 0, 0, 0);
      barrel.rotation.x = Math.PI / 2;
      return (dt, h) => (barrel.rotation.y -= (h.dir * h.speed * dt) / 0.5);
    },
  },
  truck: {
    title: "🚚 A smuggler's truck hit you!", hx: 2.2, hz: 1.1,
    build(g) {
      mesh(g, new THREE.BoxGeometry(3, 1.8, 2), mat(0x37474f), -0.5, 1.4, 0);
      const cab = mesh(g, new THREE.BoxGeometry(1.2, 1.4, 1.9), mat(0xb71c1c), 1.6, 1.2, 0);
      mesh(g, new THREE.BoxGeometry(0.05, 0.6, 1.6), mat(0x90caf9, { metalness: 0.5 }), 2.2, 1.5, 0);
      for (const x of [-1.4, 1.5]) for (const z of [-1, 1]) {
        mesh(g, new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), mat(0x111111), x, 0.4, z).rotation.x = Math.PI / 2;
      }
      mesh(g, new THREE.SphereGeometry(0.15, 8, 6), mat(0xffff8d, { emissive: 0xffff00 }), 2.2, 0.9, 0.6);
      mesh(g, new THREE.SphereGeometry(0.15, 8, 6), mat(0xffff8d, { emissive: 0xffff00 }), 2.2, 0.9, -0.6);
      return (dt, h) => (g.rotation.y = h.dir > 0 ? 0 : Math.PI); // 車頭向住行緊嘅方向
    },
  },
  cage: {
    title: '🔒 A sliding cage trapped you!', hx: 0.9, hz: 0.9,
    build(g) {
      const bar = mat(0x9e9e9e, { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 6; i++) for (const side of [-0.8, 0.8]) {
        mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), bar, -0.8 + i * 0.32, 0.9, side);
        mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), bar, side, 0.9, -0.8 + i * 0.32);
      }
      mesh(g, new THREE.BoxGeometry(1.8, 0.1, 1.8), bar, 0, 1.85, 0);
      mesh(g, new THREE.BoxGeometry(1.8, 0.1, 1.8), bar, 0, 0.05, 0);
      return null;
    },
  },
};

// Biome 6 採礦山：滾石、礦車、塵埃
Object.assign(KINDS, {
  boulder: {
    title: '🪨 A rolling boulder hit you!', hx: 0.8, hz: 0.8,
    build(g) {
      const rock = mesh(g, new THREE.DodecahedronGeometry(0.8, 0), mat(0x6d6359, { flatShading: true }), 0, 0.8, 0);
      return (dt, h) => {
        if (h.axis === 'z') rock.rotation.x += (h.dir * h.speed * dt) / 0.8; // 碌落山
        else rock.rotation.z -= (h.dir * h.speed * dt) / 0.8;
      };
    },
  },
  minecart: {
    title: '🛤️ A runaway mine cart hit you!', hx: 1.0, hz: 0.8,
    build(g) {
      mesh(g, new THREE.BoxGeometry(1.8, 0.9, 1.3), mat(0x795548), 0, 0.8, 0);
      mesh(g, new THREE.BoxGeometry(1.6, 0.3, 1.1), mat(0x424242), 0, 1.3, 0); // 一車礦石
      for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) {
        mesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10), mat(0x212121), x, 0.25, z).rotation.x = Math.PI / 2;
      }
      return null;
    },
  },
  dust: {
    title: '🌫️ You got lost in a mining dust cloud!', hx: 1.4, hz: 1.4,
    build(g) {
      const puffs = [];
      for (let i = 0; i < 6; i++) {
        const p = mesh(g, new THREE.BoxGeometry(1, 1, 1), mat(0xbcaaa4, { transparent: true, opacity: 0.7 }), (Math.random() - 0.5) * 1.8, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.8);
        p.castShadow = false;
        puffs.push(p);
      }
      return (dt, h, t) => puffs.forEach((p, i) => p.rotation.set(t + i, t * 0.7, 0));
    },
  },
});

// Biome 7 Enchanted Kingdom（小朋友：障礙物係火同 essence）
Object.assign(KINDS, {
  fire: {
    title: '🔥 A magic fire burned you!', hx: 1.0, hz: 1.0,
    build(g) {
      const flames = [0xff6d00, 0xffab00, 0xffee58].map((c, i) => {
        const f = mesh(g, new THREE.ConeGeometry(0.75 - i * 0.2, 2.2 - i * 0.5, 8), mat(c, { emissive: c, emissiveIntensity: 2.4 - i * 0.4, transparent: true, opacity: 0.9 }), 0, 1.1 - i * 0.15, 0);
        f.castShadow = false;
        return f;
      });
      mesh(g, new THREE.CylinderGeometry(0.9, 1.0, 0.25, 10), mat(0x4a148c, { emissive: 0x7c4dff, emissiveIntensity: 1.2 }), 0, 0.12, 0); // 魔法火盤
      return (dt, h, t) => flames.forEach((f, i) => {
        f.scale.set(1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 7 + i * 2) * 0.25, 1 + Math.cos(t * 8 + i) * 0.12);
        f.rotation.y = t * (i + 1);
      });
    },
  },
  essence: {
    title: '✨ Magic essence zapped you!', hx: 0.9, hz: 0.9,
    build(g) {
      const orb = mesh(g, new THREE.SphereGeometry(0.6, 16, 12), mat(0xe1bee7, { emissive: 0xd500f9, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 }), 0, 1.3, 0);
      orb.castShadow = false;
      const wisps = [0, 1, 2, 3].map((i) => {
        const w = mesh(g, new THREE.OctahedronGeometry(0.18), mat(0x80d8ff, { emissive: 0x00e5ff, emissiveIntensity: 2 }), 0, 1.3, 0);
        w.castShadow = false;
        return w;
      });
      return (dt, h, t) => {
        orb.position.y = 1.3 + Math.sin(t * 3) * 0.25;
        orb.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
        wisps.forEach((w, i) => {
          const a = t * 3 + (i / 4) * Math.PI * 2;
          w.position.set(Math.cos(a) * 0.95, orb.position.y + Math.sin(a * 2) * 0.3, Math.sin(a) * 0.95);
          w.rotation.y = t * 4;
        });
      };
    },
  },
});

const BIOME_KINDS = [
  ['log', 'smoke'],
  ['trash', 'oil'],
  ['net', 'trap'],
  ['barrel', 'oil', 'smoke'],
  ['truck', 'cage'],
  ['boulder', 'minecart', 'dust'],
  ['fire', 'essence'],
];

// 每個障礙物點樣郁：axis 'x'（打橫來回）或者 'z'（打直）；oneWay = 去到尾就由頭再嚟（滾石碌落山）
function placement(biome, i, count, rect) {
  const limit = (rect.maxX - rect.minX) / 2 - 1.5;
  if (biome !== 5) {
    // 平均分佈喺生態區入面（入口同最頂留返位），打橫來回
    const z = rect.maxZ - 8 - ((rect.maxZ - rect.minZ - 14) * (i + 0.5)) / count;
    return { axis: 'x', fixed: z, min: -limit, max: limit };
  }
  // Mining Mountain：滾石由山頂碌落山、礦車喺兩邊條路上落、塵埃喺山前面打橫飄
  const j = Math.floor(i / 3);
  const kind = i % 3;
  // 滾石由山頂前面嘅邊開始碌（山頂本身安全，可以安心救動物）
  const rollStart = SUMMIT.z + SUMMIT.halfZ + 1.5;
  if (kind === 0) return { axis: 'z', fixed: [-6, 0, 6][j % 3], min: rollStart, max: rect.maxZ - 1, oneWay: true, start: rollStart + j * 5 };
  if (kind === 1) return { axis: 'z', fixed: j % 2 ? 16.4 : -16.4, min: MOUNTAIN.minZ + 1, max: rect.maxZ - 2 };
  return { axis: 'x', fixed: MOUNTAIN.maxZ + 2.5 + j * 2.5, min: -limit, max: limit };
}

export function createHazards(scene) {
  const hazards = [];
  BIOME_KINDS.forEach((kinds, biome) => {
    const rect = biomeRect(biome);
    const count = HAZARD_COUNT[biome];
    for (let i = 0; i < count; i++) {
      const kindName = kinds[i % kinds.length];
      const kind = KINDS[kindName];
      const g = new THREE.Group();
      const path = placement(biome, i, count, rect);
      const along = path.start ?? path.min + Math.random() * (path.max - path.min);
      if (path.axis === 'x') g.position.set(along, 0, path.fixed);
      else {
        g.position.set(path.fixed, 0, along);
        if (kindName === 'minecart') g.rotation.y = Math.PI / 2; // 車頭向住路
      }
      // 腳下紅色警告圈，遠遠都見到
      const warn = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(kind.hx, kind.hz) + 0.2, Math.max(kind.hx, kind.hz) + 0.45, 32),
        new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
      );
      warn.rotation.x = -Math.PI / 2;
      warn.position.y = 0.06;
      g.add(warn);
      const h = {
        biome, kind, group: g, warn, ...path,
        followGround: biome === 5 || biome === 6, // 山上面嘅滾石跟住山嘅高度；天空王國喺高處
        dir: path.oneWay ? 1 : Math.random() < 0.5 ? -1 : 1,
        speed: kind.still ? 0 : HAZARD_SPEED[biome] * (0.7 + Math.random() * 0.6),
      };
      h.animate = kind.build(g);
      scene.add(g);
      hazards.push(h);
    }
  });
  return hazards;
}

export function updateHazards(hazards, dt, time) {
  for (const h of hazards) {
    const pos = h.group.position;
    const key = h.axis;
    pos[key] += h.dir * h.speed * dt;
    if (pos[key] > h.max || pos[key] < h.min) {
      if (h.oneWay) pos[key] = h.min; // 碌到山腳：由山頂再碌過
      else {
        pos[key] = THREE.MathUtils.clamp(pos[key], h.min, h.max);
        h.dir = -h.dir; // 撞牆就掉頭
      }
    }
    if (h.followGround) pos.y = groundAt(pos.x, pos.z, 999);
    h.warn.material.opacity = 0.35 + Math.sin(time * 5) * 0.25;
    if (h.animate) h.animate(dt, h, time);
  }
}

// 玩家撞到邊個？（冇就 null）
// feetY：玩家腳嘅高度（跳高啲就跳得過；喺山上就要小心滾石）
export function hazardHit(hazards, px, pz, feetY = 0, playerRadius = 0.4) {
  return hazards.find((h) => {
    const dx = Math.abs(px - h.group.position.x);
    const dz = Math.abs(pz - h.group.position.z);
    const sideways = h.axis === 'z' && h.kind.hx !== h.kind.hz; // 打直行嘅礦車：長闊對調
    const hx = sideways ? h.kind.hz : h.kind.hx;
    const hz = sideways ? h.kind.hx : h.kind.hz;
    return dx < hx + playerRadius && dz < hz + playerRadius && Math.abs(feetY - h.group.position.y) < 1.0;
  }) || null;
}
