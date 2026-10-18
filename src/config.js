// 共享活動伺服器（小朋友 2026-10-18 揀咗「1」：秘密沙灘個掣要所有玩家一齊有 Crazy Pet Frenzy）
// 空白 = 冇伺服器，個掣只影響自己部機（同以前一樣）
// Dad 部署完 shared-server/ 之後，將 Worker 網址貼喺下面（唔係秘密），或者 build 時用 VITE_SHARED_SERVER_URL
const PASTE_WORKER_URL_HERE = ''; // e.g. 'https://animal-rescue-shared.yourname.workers.dev'

export const SHARED_SERVER_URL = (import.meta.env?.VITE_SHARED_SERVER_URL || PASTE_WORKER_URL_HERE).replace(/\/+$/, '');
