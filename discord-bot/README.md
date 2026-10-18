# 🤖 Animal Rescue Discord bot

A Discord bot for the game.

- `/joke`: a funny animal joke (the answer is hidden, click to see it).
- `/howtoplay`: how to play, step by step.
- `/play`: opens the game inside Discord (see "Play the game inside Discord" below).
- `/spawns`: which wild animal is in each Biome right now, with rarity, kg and money, plus when the next new animals come.
- **Rare-animal pings**: when a **Legendary, Mythic or Eternal** animal spawns, it posts in your channel and pings a role.

The game picks wild animals with "fixed random" (the same time gives the same animal on every computer), so the bot works out the animals itself from the game's code (`src/spawnPredict.js`). It doesn't need the game to send it anything, and there's no secret link in the game.

> ⚠️ **Discord is for people 13 and older.** The bot app and the server belong to **Dad's** Discord account. Keep the bot token secret: it goes in `.env`, which is never put on GitHub.

## Setup (about 15 minutes, for Dad)

You need **Node.js 20.6 or newer** (`node -v`).

1. **Create the bot**
   1. Go to <https://discord.com/developers/applications>, then **New Application**, and name it (e.g. "Animal Rescue Bot").
   2. On **General Information**, copy the **Application ID**. That's `CLIENT_ID`.
   3. Open the **Bot** page, click **Reset Token**, and copy it. That's `DISCORD_TOKEN`. Never share it!
2. **Invite it to your server**
   1. Open **OAuth2 → URL Generator** and tick **bot** and **applications.commands**.
   2. Under Bot Permissions, tick **Send Messages**, **Embed Links** and **Mention Everyone** (the last one lets it ping the role).
   3. Open the link at the bottom and pick your server.
3. **Get the IDs.** In Discord, turn on **Settings → Advanced → Developer Mode**. Then right-click:
   - the server → **Copy Server ID**. That's `GUILD_ID`.
   - the channel for rare pings → **Copy Channel ID**. That's `CHANNEL_ID`.
   - (optional) make a role like **Rare Hunters**, then Server Settings → Roles → right-click it → **Copy Role ID**. That's `RARE_ROLE_ID`. If the role isn't mentionable, the bot needs the Mention Everyone permission.
4. **Fill in `.env`**
   ```bash
   cd discord-bot
   cp .env.example .env
   nano .env   # paste the values
   ```
5. **Install and start**
   ```bash
   npm install
   npm run register   # once, and again after changing commands.js
   npm start          # keep this running
   ```
   You should see `Logged in as Animal Rescue Bot#1234`. Type `/joke` in your server!

Try it without Discord: `npm run preview` prints what `/spawns`, `/howtoplay`, `/joke` and the next rare ping would look like.

## 🎮 Play the game inside Discord (Activity)

The game can run as a Discord **Activity**: everyone in a voice channel can open it inside Discord. Use the same app as the bot.

1. In the [Developer Portal](https://discord.com/developers/applications), open your app, then **Activities → Settings**, and turn on **Enable Activities**.
2. **Activities → URL Mappings**: set the root mapping **PREFIX** `/` to **TARGET** `afreakydapizza.github.io/animal-rescue-game` (no `https://`).
3. **Entry point command**: Discord makes a `/launch` command for you when Activities are on. Our `/play` command launches the game too. If it can't, it replies with the game link.
4. Put the **Application ID** in the game so it can talk to Discord. Edit `src/discordActivity.js`: `export const DISCORD_CLIENT_ID = import.meta.env?.VITE_DISCORD_CLIENT_ID || 'PASTE_ID_HERE';`. The ID is public, so it's safe on GitHub. Then push to `main`, and the website updates by itself.
5. **To play:** join a voice channel, click the 🚀 **Activities** button (rocket), and pick **Animal Rescue**. Or type `/play`.

What's different inside Discord:
- Discord can't lock the mouse, so **hold the mouse button and drag** to look around, and press **Esc** to pause.
- The game skips the Google font (Discord blocks outside websites) and uses a normal font instead.
- Saves are kept inside Discord, separate from the website save.
- Outside Discord nothing changes.

## Run it on the NAS (Docker, always on)

From the **repo root** (the bot needs the game's `src/` folder):

```bash
docker build -f discord-bot/Dockerfile -t animal-rescue-bot .
docker run -d --name animal-rescue-bot --restart unless-stopped --env-file discord-bot/.env animal-rescue-bot
docker logs -f animal-rescue-bot   # check it logged in
```

After the game changes (new animals, new balance numbers), `git pull`, then build and run again so the bot's predictions match the live game:

```bash
docker rm -f animal-rescue-bot
docker build -f discord-bot/Dockerfile -t animal-rescue-bot .
docker run -d --name animal-rescue-bot --restart unless-stopped --env-file discord-bot/.env animal-rescue-bot
```

## Good to know

- **Animals you already rescued** are gone from *your* game until the next night, but the bot still lists them.
- **Biome 7 (Enchanted Kingdom)** is only open for players who pressed the secret red button, or for everyone after `NEW_BIOME_DATE`. Before that date the bot adds a note.
- **Times** like "in 3 minutes" show in each person's own time zone (Discord does that).
- **Add jokes** in `jokes.js`: one line each, `['Question?', 'Answer!'],`.
- **The bot remembers which rare animals it already pinged** in `announced.json`, so restarting it won't ping them again.
