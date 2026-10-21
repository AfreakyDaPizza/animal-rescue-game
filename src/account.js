// 🔐 帳號系統（小朋友 Issue #8 2026-10-21）：入遊戲要登入，進度存上網（Firebase），去邊部電腦都玩得返
// - 用戶名 + 密碼（唔使 email：用戶名變做假 email 俾 Firebase 用，唔會寄任何嘢）
// - 雲端存檔：Firestore `saves/{uid}` = { name, savedAt, data: JSON 字串 }（Firestore 唔收陣列入面嘅陣列，所以成份存檔變字串）
// - 遊戲照舊用 localStorage（state.js），呢度負責：登入前將雲端存檔放入 localStorage、之後每 30 秒上載有改過嘅存檔
// - `animal-rescue-account` 記住 localStorage 嗰份存檔屬於邊個 uid，換人登入唔會撈亂
import { FIREBASE_CONFIG } from './firebaseConfig.js';

const SAVE_KEY = 'animal-rescue-save-v1'; // 同 state.js 一樣（唔 import state.js，因為佢一 import 就會讀存檔）
const OWNER_KEY = 'animal-rescue-account';
const EMAIL_DOMAIN = '@players.animal-rescue.invalid';
const SYNC_EVERY = 30; // 秒
const TIMEOUT = 10000;

export const account = { enabled: false, user: null, name: '', lastSync: 0, offline: false };

let fb = null; // { auth, db, ...functions }
let lastUploaded = '';

export function accountsEnabled() {
  const inDiscord = /[?&]frame_id=/.test(location.search); // Discord 擋晒外面網站，Discord 入面唔用帳號
  return !inDiscord && !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

async function loadFirebase() {
  if (fb) return fb;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const app = initializeApp(FIREBASE_CONFIG);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), ...authMod, ...fsMod };
  return fb;
}

const withTimeout = (p, ms = TIMEOUT) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))]);
const cleanName = (n) => n.trim();
const nameOk = (n) => /^[A-Za-z0-9_]{3,16}$/.test(n);
const toEmail = (n) => n.toLowerCase() + EMAIL_DOMAIN;

function localSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

// 比較用：唔計 savedAt（每 5 秒都變）
function saveFingerprint() {
  const s = localSave();
  if (!s) return '';
  delete s.savedAt;
  return JSON.stringify(s);
}

// ---------- 雲端存檔 ----------
async function readCloud(uid) {
  const snap = await withTimeout(fb.getDoc(fb.doc(fb.db, 'saves', uid)));
  if (!snap.exists()) return null;
  const d = snap.data();
  try {
    return { savedAt: d.savedAt || 0, data: JSON.parse(d.data) };
  } catch {
    return null;
  }
}

export async function uploadSave(force = false) {
  if (!fb || !account.user) return false;
  const fp = saveFingerprint();
  if (!fp || (!force && fp === lastUploaded)) return true;
  const raw = localStorage.getItem(SAVE_KEY);
  const s = JSON.parse(raw);
  await withTimeout(fb.setDoc(fb.doc(fb.db, 'saves', account.user.uid), { name: account.name, savedAt: s.savedAt || Date.now(), data: raw }));
  lastUploaded = fp;
  account.lastSync = Date.now();
  account.offline = false;
  return true;
}

// 登入之後、開遊戲之前：決定用雲端定本機嗰份
async function prepareSave(uid, isNew) {
  const local = localSave();
  const owner = localStorage.getItem(OWNER_KEY);
  let cloud = null;
  try {
    cloud = await readCloud(uid);
  } catch (e) {
    // 冇網：本機嗰份係自己嘅就照玩，遲啲再上載
    if (owner === uid) {
      account.offline = true;
      return;
    }
    throw e;
  }
  if (owner === uid && local && (!cloud || (local.savedAt || 0) > cloud.savedAt)) {
    // 本機嗰份最新（例如上次熄機前未上載到）
  } else if (cloud) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cloud.data));
    localStorage.removeItem(SAVE_KEY + '-backup');
  } else if (isNew && local && !owner) {
    // 第一次開帳號：未有帳號之前玩開嗰份進度跟埋入新帳號
  } else {
    localStorage.removeItem(SAVE_KEY); // 新帳號、本機嗰份係第二個人嘅 → 由頭玩
    localStorage.removeItem(SAVE_KEY + '-backup');
  }
  localStorage.setItem(OWNER_KEY, uid);
  lastUploaded = cloud && localStorage.getItem(SAVE_KEY) === JSON.stringify(cloud.data) ? saveFingerprint() : '';
}

function setUser(user) {
  account.user = user;
  account.name = user.displayName || user.email.replace(EMAIL_DOMAIN, '');
}

const ERRORS = {
  'auth/email-already-in-use': 'That name is already taken. Try another one!',
  'auth/invalid-credential': 'Wrong name or password. Try again!',
  'auth/wrong-password': 'Wrong name or password. Try again!',
  'auth/user-not-found': 'Wrong name or password. Try again!',
  'auth/weak-password': 'Your password needs at least 6 letters or numbers.',
  'auth/too-many-requests': 'Too many tries! Wait a minute and try again.',
  'auth/network-request-failed': 'No internet connection 📡',
  timeout: 'The internet is too slow 📡 Try again!',
};
const errorText = (e) => ERRORS[e?.code] || 'Something went wrong 😵 (' + (e?.code || e?.message || 'unknown') + ')';

// ---------- 登入畫面 ----------
function loginScreen() {
  const el = document.createElement('div');
  el.id = 'login';
  el.className = 'overlay';
  el.innerHTML = `
    <div class="card start-card login-card">
      <div class="logo" aria-label="Animal Rescue">
        <span class="logo-paw">🐾</span>
        <span class="logo-line logo-1">ANIMAL</span>
        <span class="logo-line logo-2">RESCUE</span>
      </div>
      <div class="login-tabs">
        <button type="button" data-mode="login" class="on">🔑 Log in</button>
        <button type="button" data-mode="signup">✨ New account</button>
      </div>
      <form class="login-form" autocomplete="on">
        <label>👤 Name<input name="name" maxlength="16" autocomplete="username" placeholder="RangerPanda" required /></label>
        <label>🔒 Password<input name="pass" type="password" maxlength="64" autocomplete="current-password" required /></label>
        <p class="login-note" data-for="signup" hidden>Pick a fun name (3–16 letters, numbers or _).<br/>⚠️ Don't use your real name! Ask a grown-up to help you remember your password.</p>
        <p class="login-error" hidden></p>
        <button class="play-button" type="submit">▶ LOG IN</button>
      </form>
      <button type="button" class="login-offline" hidden>Play offline (progress stays on this computer)</button>
    </div>`;
  document.body.appendChild(el);
  return el;
}

// 未登入就顯示登入畫面，登入完 resolve
function askLogin() {
  return new Promise((resolve) => {
    const el = loginScreen();
    const form = el.querySelector('form');
    const err = el.querySelector('.login-error');
    const btn = form.querySelector('.play-button');
    const pass = form.elements.pass;
    const offline = el.querySelector('.login-offline');
    let mode = 'login';
    const setMode = (m) => {
      mode = m;
      el.querySelectorAll('.login-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
      el.querySelector('[data-for="signup"]').hidden = m !== 'signup';
      btn.textContent = m === 'signup' ? '✨ MAKE MY ACCOUNT' : '▶ LOG IN';
      pass.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
      err.hidden = true;
    };
    el.querySelectorAll('.login-tabs button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    const showError = (t) => {
      err.textContent = t;
      err.hidden = false;
    };
    offline.addEventListener('click', () => {
      el.remove();
      resolve(false);
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = cleanName(form.elements.name.value);
      if (!nameOk(name)) return showError('Names need 3–16 letters, numbers or _ (no spaces).');
      if (pass.value.length < 6) return showError('Your password needs at least 6 letters or numbers.');
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = '⏳ ...';
      err.hidden = true;
      try {
        let cred;
        if (mode === 'signup') {
          cred = await withTimeout(fb.createUserWithEmailAndPassword(fb.auth, toEmail(name), pass.value));
          await fb.updateProfile(cred.user, { displayName: name });
        } else {
          cred = await withTimeout(fb.signInWithEmailAndPassword(fb.auth, toEmail(name), pass.value));
        }
        setUser(cred.user);
        await prepareSave(cred.user.uid, mode === 'signup');
        el.remove();
        resolve(true);
      } catch (e) {
        console.warn('login failed', e);
        showError(errorText(e));
        if (e?.code === 'auth/network-request-failed' || e?.code === 'timeout') offline.hidden = false;
        btn.disabled = false;
        btn.textContent = label;
      }
    });
    setTimeout(() => form.elements.name.focus(), 50);
  });
}

// boot.js 開遊戲之前叫：搞掂登入 + 存檔。回傳 true = 用緊帳號
export async function startAccount() {
  if (!accountsEnabled()) return false;
  try {
    await withTimeout(loadFirebase(), 20000);
    const user = await withTimeout(new Promise((ok) => {
      const stop = fb.onAuthStateChanged(fb.auth, (u) => {
        stop();
        ok(u);
      });
    }));
    if (user) {
      // 上次已經登入咗（Firebase 記得）→ 直接入
      setUser(user);
      try {
        await prepareSave(user.uid, false);
      } catch (e) {
        console.warn('cloud save failed, asking to log in again', e);
        await fb.signOut(fb.auth);
        account.user = null;
        if (!(await askLogin())) return false;
      }
    } else if (!(await askLogin())) return false;
  } catch (e) {
    console.warn('account system unavailable, playing offline', e);
    return false;
  }
  account.enabled = true;
  setInterval(() => uploadSave().catch(() => (account.offline = true)), SYNC_EVERY * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') uploadSave().catch(() => {});
  });
  return true;
}

export async function logout() {
  try {
    await uploadSave(true);
  } catch {
    // 上載唔到都照登出：本機嗰份仲喺度，下次同一個人登入會揀返最新
  }
  await fb.signOut(fb.auth);
  location.reload();
}
