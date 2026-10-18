// 喺 Discord 入面玩（Discord Activity，小朋友 2026-10-18：「I WANT IT INTO A APP IN DISCORD」）
// Discord 會喺網址加 ?frame_id=…&instance_id=…；得嗰陣先載 Discord SDK，平時網頁版完全唔變
// Discord 個 iframe 鎖唔到滑鼠：改用「撳住滑鼠拖」轉鏡頭（MouseLook.dragLook），Esc 暫停

// Application ID 係公開嘅（唔係秘密），Dad 喺 discord.com/developers 抄落嚟；或者 build 時用 VITE_DISCORD_CLIENT_ID
export const DISCORD_CLIENT_ID = import.meta.env?.VITE_DISCORD_CLIENT_ID || '';

export function inDiscord() {
  const q = new URLSearchParams(location.search);
  return q.has('frame_id') && q.has('instance_id');
}

// 回傳 DiscordSDK（ready 咗）或者 null（唔喺 Discord／冇 Client ID／連唔到）
export async function startDiscord() {
  if (!inDiscord()) return null;
  document.body.classList.add('in-discord');
  if (!DISCORD_CLIENT_ID) {
    console.warn('Running inside Discord but DISCORD_CLIENT_ID is empty (src/discordActivity.js)');
    return null;
  }
  try {
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await sdk.ready();
    return sdk;
  } catch (e) {
    console.warn('Discord SDK failed to start:', e);
    return null;
  }
}
