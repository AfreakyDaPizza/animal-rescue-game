# 🌍 Animal Rescue shared events (for Dad)

Without this, the secret beach button only starts the **Crazy Pet Frenzy** on the computer of the person who pressed it.
With this tiny server, pressing it starts the frenzy for **everyone playing**, and they all get the same crazy pets.

- **What it saves:** only 2 timestamps (when the last frenzy started and ended). No names, no accounts, no chat.
  IPs are only used for a 1-minute rate limit, kept in memory (hashed), never saved.
- **Cost:** free. It's a Cloudflare Worker plus one Durable Object, and both are on the Workers **Free** plan.
  The free plan allows 100,000 requests/day. Each open game asks every 10 seconds (only while the tab is visible), so about 360 requests per player per hour. That's plenty for a few friends.
- **Why a Durable Object and not KV:** KV can take up to a minute to show a change in other places, and two presses at the same time could both win. A Durable Object is one single place that answers everyone, so the cooldown is exact.
- **Safety:** browsers can only call it from the game's website (https://afreakydapizza.github.io), the Discord Activity, and localhost.
  There's a global cooldown (15 min, the same as the game) and a rate limit (5 presses and 30 checks per minute per IP).

## Setup (about 10 minutes)

You need Node 20+ and a free Cloudflare account (https://dash.cloudflare.com/sign-up).

```bash
cd shared-server
npm install
npx wrangler login     # opens the browser, log in to Cloudflare
npx wrangler deploy    # prints your Worker address, e.g. https://animal-rescue-shared.<you>.workers.dev
```

Check it works: open `https://animal-rescue-shared.<you>.workers.dev/state` in the browser. You should see something like `{"crazy":null,"readyAt":0,"now":...}`.

Then tell the game where the server is. The address is not a secret.

1. Open `src/config.js` and paste the address into `PASTE_WORKER_URL_HERE`.
2. Commit and push to `main`. GitHub Pages rebuilds the game in about 1 minute.

That's it. Press the secret button, and everyone with the game open gets the frenzy within about 10 seconds.

### Optional: tell Discord when someone presses it

Create a webhook (Discord → Server Settings → Integrations → Webhooks → Copy Webhook URL), then:

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL   # paste the webhook URL (stays secret, never in git)
```

The Discord bot's `/spawns` can show the frenzy too: put `SHARED_SERVER_URL=https://animal-rescue-shared.<you>.workers.dev` in `discord-bot/.env`.

### Optional: inside the Discord Activity

Discord doesn't let the Activity talk to other websites directly. In the Developer Portal → your app → Activities → URL Mappings, add:

| Prefix | Target |
|---|---|
| `/shared` | `animal-rescue-shared.<you>.workers.dev` |

The game uses `/.proxy/shared/...` automatically when it runs inside Discord.

## Change the numbers

The frenzy length and cooldown live in `wrangler.toml` (`CRAZY_SECONDS`, `COOLDOWN_MINUTES`). Keep them the same as `CRAZY_FRENZY_SECONDS` / `CRAZY_COOLDOWN_MINUTES` in `src/data/balance.js`, then run `npx wrangler deploy` again.

## Test locally without Cloudflare

```bash
node shared-server/mock.js                                     # same rules, port 8787
VITE_SHARED_SERVER_URL=http://localhost:8787 npx vite --port 5180
```

Open the game in 2 browser windows (or one normal and one private) and press the button in one. The other gets the frenzy within about 10 seconds.

## If the server is down

The game doesn't break: the button just works on your own computer, like before.
