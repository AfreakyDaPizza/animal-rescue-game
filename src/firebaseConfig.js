// 🔐 Firebase 設定（帳號系統，小朋友 Issue #8 2026-10-21）
// Dad 喺 console.firebase.google.com 開咗項目之後，Project settings → Your apps → Web app 抄落嚟。
// 呢啲值係公開嘅（唔係密碼），保安靠 Firestore 規則（firestore.rules）。
// 留空 = 冇帳號系統，遊戲照舊只存喺瀏覽器。
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};
