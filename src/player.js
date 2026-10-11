// 玩家：第一身視角（鏡頭就係玩家對眼）
// 滑鼠轉頭，WASD／方向鍵行

import * as THREE from 'three';
import { isWalkable, groundAt, HUB } from './world.js';
import { state } from './state.js';

const RADIUS = 0.4;      // 玩家有幾闊（用嚟撞嘢）
const EYE_HEIGHT = 1.6;  // 對眼有幾高
const GRAVITY = 28;      // 跌落嚟幾快
const JUMP_SPEED = 10.5; // 跳起有幾勁（大約跳到 2 米高）
const AIR_SPEED_CAP = 9; // 喺半空／石台上面最快幾快（Speed 好高都唔會一跳飛過頭）

// Speed 數值 → 每秒行幾多格
// 用 log：Speed 每加倍，就快 3 格／秒。咁 Speed 去到幾百萬都唔會快到飛出畫面。
//   100 → 6、200 → 9、400 → 12、1,000 → 16、2,000,000 → 49
export function walkSpeed(speed) {
  return 6 + 3 * Math.log2(Math.max(speed, 100) / 100);
}

// ---- 滑鼠轉頭（自己寫，取代 three.js 嘅 PointerLockControls）----
// Chrome 鎖住滑鼠時間中會俾一下好大嘅「假」移動（電腦慢嗰陣更多），鏡頭就會亂飛。
// 呢度：1) 叫瀏覽器用原始滑鼠數據；2) 一下郁太大就當係假嘢唔理；3) 上下望有上限。
const MOUSE_SENSITIVITY = 0.0022;
const MAX_MOUSE_JUMP = 250; // 一次郁超過幾多像素就當係假嘢

class MouseLook extends THREE.EventDispatcher {
  constructor(camera, domElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.isLocked = false;
    this.freeMode = false; // Shift Lock 熄咗：見到滑鼠，按住右鍵拖先轉鏡頭
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (e) => this.onMove(e));
    domElement.addEventListener('contextmenu', (e) => e.preventDefault()); // 右鍵唔好彈選單
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      this.skip = 2; // 啱啱鎖住嗰兩下通常係假嘢
      this.dispatchEvent({ type: this.isLocked ? 'lock' : 'unlock' });
    });
  }
  onMove(e) {
    const dragging = this.freeMode && !this.isLocked && (e.buttons & 2); // 放開滑鼠時：右鍵拖轉鏡頭
    if (!this.isLocked && !dragging) return;
    if (this.skip > 0) {
      this.skip -= 1;
      return;
    }
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    if (Math.abs(dx) > MAX_MOUSE_JUMP || Math.abs(dy) > MAX_MOUSE_JUMP) return;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= dx * MOUSE_SENSITIVITY;
    this.euler.x -= dy * MOUSE_SENSITIVITY;
    this.euler.x = Math.max(-1.45, Math.min(1.45, this.euler.x));
    this.euler.z = 0;
    this.camera.quaternion.setFromEuler(this.euler);
  }
  lock() {
    const el = this.domElement;
    try {
      const p = el.requestPointerLock({ unadjustedMovement: true });
      // 有啲電腦唔支援原始滑鼠數據，就用普通模式
      if (p?.catch) p.catch(() => el.requestPointerLock()?.catch?.(() => {}));
    } catch {
      el.requestPointerLock();
    }
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

export function createPlayer(camera, domElement) {
  camera.rotation.order = 'YXZ'; // rotation.y 就係「望緊邊個方向」（箭咀要用）
  const controls = new MouseLook(camera, domElement);
  // 由 Hub 中間開始，望住生態區（-z）
  camera.position.set((HUB.minX + HUB.maxX) / 2, EYE_HEIGHT, HUB.maxZ - 10);
  camera.rotation.set(0, 0, 0);
  return { controls, camera, feetY: 0, vy: 0, grounded: true, bob: 0 };
}

// 記住而家撳住咗邊啲掣
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear()); // 轉咗視窗就當放晒手

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// extraGround：額外嘅地台高度（例如企喺跑步機上面）
// 撳空白鍵跳；石台要跳先上到
export function updatePlayer(player, dt, extraGround = 0) {
  const { camera } = player;
  let f = 0;
  let s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;

  const p = camera.position;
  const moving = f !== 0 || s !== 0;
  player.walking = moving && player.grounded;
  if (moving) {
    // 「前」= 鏡頭望緊嘅方向（唔理上下）
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, UP);

    const len = Math.hypot(f, s); // 斜行唔好快過直行
    let speed = walkSpeed(state.speed);
    if (!player.grounded || player.feetY > 0.6) speed = Math.min(speed, AIR_SPEED_CAP);
    const step = speed * dt;
    const moveX = ((forward.x * f + right.x * s) / len) * step;
    const moveZ = ((forward.z * f + right.z * s) / len) * step;

    // 分開試 x 同 z：撞牆嗰邊停，另一邊照行，咁貼住牆都可以滑過去
    if (isWalkable(p.x + moveX, p.z, RADIUS, player.feetY)) p.x += moveX;
    if (isWalkable(p.x, p.z + moveZ, RADIUS, player.feetY)) p.z += moveZ;
    if (player.grounded) player.bob += dt * 10;
  }

  // 跳 + 地心吸力
  const ground = Math.max(extraGround, groundAt(p.x, p.z, player.feetY));
  if (player.grounded && keys.has('Space')) {
    player.vy = JUMP_SPEED;
    player.grounded = false;
    player.jumped = true; // main.js 用嚟出跳嘅聲
  }
  if (!player.grounded || player.feetY > ground + 0.01) {
    player.vy -= GRAVITY * dt;
    player.feetY += player.vy * dt;
    player.grounded = false;
    if (player.feetY <= ground) {
      player.feetY = ground;
      player.vy = 0;
      player.grounded = true;
    }
  } else if (player.feetY < ground) {
    player.feetY += (ground - player.feetY) * Math.min(1, dt * 12); // 踏上矮台（跑步機）
  }

  // 行路時個頭輕輕上下郁
  const bobOffset = player.walking ? Math.sin(player.bob) * 0.05 : 0;
  camera.position.y = player.feetY + EYE_HEIGHT + bobOffset;
}

// 傳送（例如入夜送返 Hub）：連腳嘅高度一齊重設
export function teleportPlayer(player, x, z) {
  player.camera.position.set(x, EYE_HEIGHT, z);
  player.feetY = 0;
  player.vy = 0;
  player.grounded = true;
}
