// The rules, shared by the real Worker (index.js) and the local test server (mock.js)
// mem = { data: { startedAt, endsAt }, hits: Map } ; config = { seconds, cooldownMinutes }

export function view(mem, config, now = Date.now()) {
  const d = mem.data;
  return {
    crazy: now < d.endsAt ? { startedAt: d.startedAt, endsAt: d.endsAt } : null,
    readyAt: d.startedAt ? d.startedAt + config.cooldownMinutes * 60000 : 0,
    now,
  };
}

// Simple rate limit per (hashed) IP: GET 30 / minute, POST 5 / minute
async function limited(mem, ip, kind, max) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(ip)));
  const key = kind + ':' + [...new Uint8Array(hash)].slice(0, 8).join('.');
  const now = Date.now();
  const list = (mem.hits.get(key) || []).filter((t) => now - t < 60000);
  list.push(now);
  mem.hits.set(key, list);
  if (mem.hits.size > 5000) mem.hits.clear();
  return list.length > max;
}

export async function handleState(mem, ip, config) {
  if (await limited(mem, ip, 'get', 30)) return { status: 429, body: { ...view(mem, config), error: 'slow down' } };
  return { status: 200, body: view(mem, config) };
}

export async function handleCrazy(mem, ip, config) {
  const now = Date.now();
  if (await limited(mem, ip, 'post', 5)) return { status: 429, body: { ...view(mem, config, now), started: false, error: 'slow down' } };
  const v = view(mem, config, now);
  if (v.crazy || now < v.readyAt) return { status: 200, body: { ...v, started: false } }; // already on, or still recharging
  mem.data = { startedAt: now, endsAt: now + config.seconds * 1000 };
  return { status: 200, save: true, started: true, body: { ...view(mem, config, now), started: true } };
}
