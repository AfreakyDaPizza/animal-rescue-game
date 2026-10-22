// 玩家：第一身視角（鏡頭就係玩家對眼）
// 滑鼠轉頭，WASD／方向鍵行

import * as THREE from 'three';
import { isWalkable, groundAt, HUB } from './world.js';
import { state } from './state.js';
import { JUMP_POWER_HEIGHT, JUMP_POWER_MAX } from './data/balance.js';
import { boostMult } from './boosts.js'; // ⚡ Meteoric Shop 嘅 1.5x Speed

const RADIUS = 0.4;      // 玩家有幾闊（用嚟撞嘢）
const EYE_HEIGHT = 1.6;  // 對眼有幾高
const GRAVITY = 28;      // 跌落嚟幾快
const JUMP_SPEED = 10.5; // 跳起有幾勁（大約跳到 2 米高）
const STEP = 0.45; // 一級樓梯最高幾高（同 world.js 嘅 STEP_UP 一樣）

// Speed 數值 → 每秒行幾多格
// 用 log：Speed 每加倍，就快 3 格／秒。咁 Speed 去到幾百萬都唔會快到飛出畫面。
//   100 → 6、200 → 9、400 → 12、1,000 → 16、2,000,000 → 49
// 慢行模式（M 掣，小朋友 2026-10-19：朋友玩太快會頭暈）：最快只係普通行路速度
export const moveOpts = { slow: false };
export const SLOW_WALK_SPEED = 7;
export function walkSpeed(speed) {
  return 6 + 3 * Math.log2(Math.max(speed, 100) / 100);
}

// 跳起嘅速度：普通跳大約 2 米高；Jump Power（Gym 嘅彈床）每點高多 JUMP_POWER_HEIGHT 米
export const jumpHeight = (power = state.jumpPower) => (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) + Math.min(Math.max(0, power || 0), JUMP_POWER_MAX) * JUMP_POWER_HEIGHT;
export const jumpVelocity = (height = jumpHeight()) => Math.sqrt(2 * GRAVITY * height);

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
    this.virtual = false; // 手機版（小朋友 2026-10-17）：冇滑鼠鎖，「鎖住」只係代表「玩緊」
    this.dragLook = false; // Discord Activity（電腦）：冇滑鼠鎖，撳住滑鼠拖轉鏡頭（main.js 設定）
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
    if (this.dragLook) {
      // Discord 入面（鎖唔到滑鼠）：撳住滑鼠拖先轉鏡頭
      if (!e.buttons || (!this.isLocked && !this.freeMode)) return;
    } else {
      const dragging = this.freeMode && !this.isLocked && (e.buttons & 2); // 放開滑鼠時：右鍵拖轉鏡頭
      if (!this.isLocked && !dragging) return;
    }
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
  // 手機：手指拖動轉鏡頭（dx、dy 係像素）
  look(dx, dy, sensitivity = 0.005) {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= dx * sensitivity;
    this.euler.x -= dy * sensitivity;
    this.euler.x = Math.max(-1.45, Math.min(1.45, this.euler.x));
    this.euler.z = 0;
    this.camera.quaternion.setFromEuler(this.euler);
  }
  lock() {
    if (this.virtual) {
      if (!this.isLocked) {
        this.isLocked = true;
        this.dispatchEvent({ type: 'lock' });
      }
      return;
    }
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
    if (this.virtual) {
      if (this.isLocked) {
        this.isLocked = false;
        this.dispatchEvent({ type: 'unlock' });
      }
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

export function createPlayer(camera, domElement) {
  camera.rotation.order = 'YXZ'; // rotation.y 就係「望緊邊個方向」（箭咀要用）
  const controls = new MouseLook(camera, domElement);
  // 由 Hub 中間開始，望住生態區（-z）
  camera.position.set(HUB.cx, EYE_HEIGHT, 14); // 噴水池同入口中間
  camera.rotation.set(0, 0, 0);
  return { controls, camera, feetY: 0, vy: 0, grounded: true, bob: 0 };
}

// 手機搖桿（mobile.js 寫入）：x = 向右、y = 向前（-1…1）；jump = 撳住 JUMP 掣
export const touchInput = { x: 0, y: 0, jump: false };

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
  // 手機搖桿：推得幾盡就行幾快
  let mag = 1;
  const touchMag = Math.hypot(touchInput.x, touchInput.y);
  if (touchMag > 0.12 && f === 0 && s === 0) {
    f = touchInput.y;
    s = touchInput.x;
    mag = Math.min(1, touchMag);
  }

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
    // 喺半空都保持跑步速度（小朋友老師話：跑跑下跳起會慢咗好多，2026-10-18 取消咗半空限速）
    const speed = (moveOpts.slow ? Math.min(SLOW_WALK_SPEED, walkSpeed(state.speed)) : walkSpeed(state.speed)) * boostMult('speed'); // ⚡ 1.5x Speed boost
    const step = speed * dt * mag;
    // 跑得好快時分開幾細步行，咁先唔會跳過樓梯級或者穿牆
    const parts = Math.min(40, Math.max(1, Math.ceil(step / 0.3)));
    const moveX = ((forward.x * f + right.x * s) / len) * (step / parts);
    const moveZ = ((forward.z * f + right.z * s) / len) * (step / parts);
    for (let i = 0; i < parts; i++) {
      // 分開試 x 同 z：撞牆嗰邊停，另一邊照行，咁貼住牆都可以滑過去
      if (isWalkable(p.x + moveX, p.z, RADIUS, player.feetY)) p.x += moveX;
      if (isWalkable(p.x, p.z + moveZ, RADIUS, player.feetY)) p.z += moveZ;
      // 行上／落樓梯：一級一級即刻踏上去，唔使跳
      if (player.grounded) {
        const g = Math.max(extraGround, groundAt(p.x, p.z, player.feetY));
        if (Math.abs(g - player.feetY) <= STEP + 0.05) player.feetY = g;
      }
    }
    if (player.grounded) player.bob += dt * 10;
  }

  // 跳 + 地心吸力
  const ground = Math.max(extraGround, groundAt(p.x, p.z, player.feetY));
  const wantJump = keys.has('Space') || touchInput.jump; // 手機：撳住 JUMP 掣
  if (player.grounded && wantJump) {
    player.vy = jumpVelocity();
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
