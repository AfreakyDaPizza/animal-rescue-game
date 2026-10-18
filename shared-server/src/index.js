// Animal Rescue shared events (kid 2026-10-18: the secret beach button should start the frenzy for EVERYONE)
//   GET  /state  -> { crazy: { startedAt, endsAt } | null, readyAt, now }
//   POST /crazy  -> starts a CRAZY PET FRENZY for everyone if the cooldown is over, else returns the current state ({ started: false })
// Saved: only 2 timestamps (when the last frenzy started / ended). No names, no accounts, no IPs on disk.
// One Durable Object ("global") holds the state, so every player sees exactly the same thing (no race between two presses).
import { handleState, handleCrazy } from './logic.js';

const ALLOWED = [
  /^https:\/\/afreakydapizza\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.discordsays\.com$/, // the game inside Discord (Activity)
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, // dev
];

export function cors(origin) {
  const ok = origin && ALLOWED.some((r) => r.test(origin));
  return ok
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : { Vary: 'Origin' };
}

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    // Other websites can't use it from a browser (CORS); scripts can, so the Durable Object also has a cooldown + rate limit
    if (origin && !headers['Access-Control-Allow-Origin']) return json({ error: 'origin not allowed' }, 403, headers);
    const route = new URL(request.url).pathname.replace(/^\/shared/, ''); // "/shared/state" works too (Discord Activity URL mapping)
    if (!['/state', '/crazy'].includes(route)) return json({ error: 'not found' }, 404, headers);
    if (route === '/crazy' && request.method !== 'POST') return json({ error: 'use POST' }, 405, headers);
    const stub = env.EVENTS.get(env.EVENTS.idFromName('global'));
    const res = await stub.fetch(`https://do${route}`, { method: request.method, headers: { 'X-Ip': request.headers.get('CF-Connecting-IP') || 'local' } });
    return json(await res.json(), res.status, headers);
  },
};

export class SharedEvents {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.mem = { hits: new Map() }; // rate limit: in memory only, never saved
  }

  async fetch(request) {
    const route = new URL(request.url).pathname;
    const ip = request.headers.get('X-Ip');
    this.mem.data ??= (await this.ctx.storage.get('crazy')) || { startedAt: 0, endsAt: 0 };
    const config = { seconds: Number(this.env.CRAZY_SECONDS || 60), cooldownMinutes: Number(this.env.COOLDOWN_MINUTES || 15) };
    const r = route === '/state' ? await handleState(this.mem, ip, config) : await handleCrazy(this.mem, ip, config);
    if (r.save) await this.ctx.storage.put('crazy', this.mem.data);
    if (r.started && this.env.DISCORD_WEBHOOK_URL) {
      this.ctx.waitUntil(
        fetch(this.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🔘 Someone pressed the secret button! **CRAZY PET FRENZY** for everyone for ${config.seconds} s! 🤪 https://afreakydapizza.github.io/animal-rescue-game/` }),
        }).catch(() => {}),
      );
    }
    return Response.json(r.body, { status: r.status });
  }
}
