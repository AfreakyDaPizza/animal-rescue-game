// 同共享活動伺服器（shared-server/）傾偈：GET /state、POST /crazy
// 連唔到（冇設定、斷線、伺服器死咗）就回傳 null，唔會出錯、唔會喺 console 嘈
import { SHARED_SERVER_URL } from './config.js';
import { inDiscord } from './discordActivity.js';

// Discord Activity 入面唔准直接連出去：要經 Discord 嘅 URL mapping（/shared → Worker），見 shared-server/README.md
const base = () => (!SHARED_SERVER_URL ? '' : inDiscord() ? '/.proxy/shared' : SHARED_SERVER_URL);
export const sharedOn = () => !!base();

async function call(path, method = 'GET') {
  if (!sharedOn()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(base() + path, { method, signal: ctrl.signal, cache: 'no-store' });
    const data = await res.json();
    return data && typeof data.now === 'number' ? data : null; // 429 都有 state，照用
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchShared = () => call('/state');
export const postCrazy = () => call('/crazy', 'POST');
