// 固定用 5180 port（5173 俾第二個項目用緊）
// base './'：GitHub Pages 網址有 /animal-rescue-game/ 前綴，用相對路徑先搵到檔案
export default {
  base: './',
  server: { port: 5180, strictPort: true },
};
