// Local test server: same API and rules as the Worker, no Cloudflare needed
//   node mock.js            (port 8787)   ·   PORT=9000 node mock.js
//   then run the game with VITE_SHARED_SERVER_URL=http://localhost:8787 npx vite
import http from 'node:http';
import { cors } from './src/index.js';
import { handleState, handleCrazy } from './src/logic.js';

const PORT = Number(process.env.PORT || 8787);
const config = { seconds: Number(process.env.CRAZY_SECONDS || 60), cooldownMinutes: Number(process.env.COOLDOWN_MINUTES || 15) };
const mem = { data: { startedAt: 0, endsAt: 0 }, hits: new Map() };

http
  .createServer(async (req, res) => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req.headers.origin) };
    if (req.method === 'OPTIONS') return res.writeHead(204, headers).end();
    const route = new URL(req.url, 'http://x').pathname.replace(/^\/shared/, '');
    let r;
    if (route === '/state') r = await handleState(mem, req.socket.remoteAddress, config);
    else if (route === '/crazy' && req.method === 'POST') r = await handleCrazy(mem, req.socket.remoteAddress, config);
    else r = { status: 404, body: { error: 'not found' } };
    if (r.started) console.log('🤪 frenzy started', new Date().toLocaleTimeString());
    res.writeHead(r.status, headers).end(JSON.stringify(r.body));
  })
  .listen(PORT, () => console.log(`Shared events mock on http://localhost:${PORT}`));
