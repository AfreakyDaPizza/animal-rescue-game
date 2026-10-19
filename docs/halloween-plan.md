# 🎃 Halloween Update: the kid's idea (2026-10-19, not built yet)

> The kid said "don't code it, it's an idea". Wait for the pictures and answers on GitHub before building.

## Getting there
- A **Halloween portal** in the **middle of the Hub, replacing the fountain**. You can go in and out any time.
- **Loading screen** between worlds (spooky and cool), so nothing crashes while the world loads.
- You spawn in a **circle of ruins**. It's also the **safe spot**.
- Large map. Everything is spooky and magical: a horror sky and creepy short render distance / fog.

## 3 biomes
1. 🎃 **Pumpkin Graveyard**
2. 👻 **Hollow Sprites**
3. 🏚️ **Abandoned Manor**

- You rescue (the kid says "steal") **eggs** from the biomes. Egg and pet pictures come later on GitHub.
- **Bosses**, one per biome:
  - They need **Speed**, like the normal bosses.
  - **NO MERCY:** every biome you cross, that biome's monster also chases you.
  - When you grab an egg, the **fog closes in** (very low render distance), and a **glowing red arrow** leads you back to the safe spot (the spawn ruins).
- Put eggs in your **Egg Graveyard**, hatch them, take the pet to the normal world and put it on your Plot.

## 🚂 Phantom Express
- The train **arrives every hour** and stays for **30 minutes** of ghost catching.
- It goes to **another Halloween world** where an event is always on. **No bosses** there.
- 🧹 **Ghost Vacuum**:
  - Lv1–5. Hold it and press or hold **E** to catch ghosts.
  - It's not saved to the normal inventory; it stays in the Halloween world.
- **6 ghosts.** Names and pictures come later. Stronger ghosts take longer to catch.
- Catching ghosts gives **💀 Soul Dust**. Use it to:
  - upgrade the vacuum (max Lv5);
  - trade **400 souls** at the **Statue of Halloween** for a **🔮 Halloween Shard** (stackable).

## 🔮 Halloween Shard mutations
- Use a shard on your Plot. Each pet has a **25% chance** to get hit.
- A pet that gets hit becomes 50/50 **👻 Spectral (×4)** or **🌑 Phantom (×5)**.
- **Animation:** the pets on the Plot disappear, the Halloween portal takes the chosen pet away, then sends it back with its mutation (like Steal an Egg's mutation mechanic).

## 🎣 Fishing (the other side of the map)
- **15 rods** to buy. A better rod gives a better chance of the best Halloween egg.
- You fish for **eggs**.
- The rod breaks when you go back to the normal world.

## Kid-friendly wording (suggested to the kid)
- "Rescue" eggs, not "steal".
- The vacuum "catches" ghosts (lost spirits), not "kills" them.
- The red arrow glows and drips red, but isn't gory.

## Still waiting for (from the kid, on GitHub)
- [x] Where the Halloween portal goes in the Hub → replaces the fountain in the middle
- [x] Start date → **Wednesday 21 October 2026**; the Control Panel can unlock it early
- [x] Eggs, bosses and souls → Issue #6 (pictures: soul bestiary + boss sheet)
- [x] Vacuum, rods, Phantom Express → Claude designs them
- [ ] The map (the kid is sending it on GitHub)

## 🗺️ The map (built 2026-10-19, `src/halloweenShape.js`)
The kid said "do the world first". We designed the map ourselves. Everything is far to the west (x ≈ -1400), and the Ghost World is even further (x ≈ -2000).

```
                 ┌──────────────────────┐ z -350
                 │  🏚️ ABANDONED MANOR   │  hw3 (Boss: Bone Drake guards the manor gate)
                 │  (manor + front yard)│  eggs in the front yard
                 ├──────────────────────┤ z -240
                 │  👻 HOLLOW SPRITES    │  hw2 (Boss: Hollow Wraith)
                 │  (dark forest, fog)  │
                 ├──────────────────────┤ z -130
                 │  🎃 PUMPKIN GRAVEYARD │  hw1 (Boss: Pumpkin Tyrant)
                 │ (pumpkins, tombs)    │
    ┌────────┐   └─────────╮  ╭─────────┘ z -20
    │🎣 FISH- │   ╭─────────╯  ╰────────╮   ┌──────────────┐
    │ ING     ├───┤  ⭕ SPAWN RUINS     ├───┤ 🚂 TRAIN      │══ tracks ══
    │ LAKE    │   │ safe zone + portal  │   │   STATION    │
    └────────┘   ╰─────────╮  ╭────────╯   └──────────────┘
                           │🪦 EGG  │  z 18…66
                           │GRAVEYARD│ (8 egg slots)
                           └────────┘
   🚂 The Phantom Express goes to the 👻 GHOST WORLD: a misty island with the Statue of Halloween + the vacuum shop.
```

- The Hub portal replaces the fountain. It opens on `HALLOWEEN_OPEN_DATE` (balance.js), or early with the Control Panel (`state.halloweenEarly`).
- A spooky loading screen shows for every trip (`showLoading` in `src/halloweenWorld.js`). The world is built the first time you go in.
- Horror sky, close fog per area, lightning: `applyHalloweenSky` (`src/halloweenWorld.js`).
- Hooks for the next helpers (`src/halloweenShape.js`):
  - **Positions:** `HW_BIOMES[i].rect / bossHome / eggZone / entrance`, `EGG_SLOTS`, `TRAIN_BOARD`, `TRAIN_STOP`, `TRACK_X`, `GHOST_WORLD`, `GHOST_ARRIVE`, `GHOST_TRAIN_STOP`, `STATUE_OF_HALLOWEEN`, `VACUUM_SHOP`, `FISH_SPOT`, `ROD_SHOP`, `DOCK`, `RUINS`, `RUINS_SAFE_R`.
  - **Checks:** `inHalloween`, `inGhostWorld`, `inSafeZone`, `hwZoneAt`, `hwBiomeIndexAt`.

## ✅ Built: eggs + no-mercy bosses (src/halloweenEggs.js)
- 3 eggs lie in each biome (rarer ones deeper). Each has a rarity-coloured ring, a light beam, a soft glow and a bob/wobble. A new egg appears 40 s after one is taken.
- E grabs an egg:
  - the fog closes in and turns dark red;
  - a glowing red arrow on the ground plus a HUD pill point you to the Spawn Ruins;
  - the egg's boss chases you after a 3 s head start;
  - NO MERCY: every biome you run through wakes its boss too.
- Caught: the egg goes back to its spot and you're thrown back to the Spawn Ruins. Reaching the safe zone rescues the egg into state.hwEggs.
- Boss moves:
  - Pumpkin Tyrant ground-pounds;
  - Hollow Wraith teleport-hops (never closer than 10 m);
  - Bone Drake fly-dashes.
- Egg Graveyard (8 slots): E places your rarest egg, then a countdown runs (even offline). E hatches it with a crack/flash and the pet pops out into the backpack. It's added to the Index with a reward.
- Numbers in balance.js: HALLOWEEN_BOSS_SPEED, HALLOWEEN_BOSS_SIZE, HALLOWEEN_HEAD_START, HALLOWEEN_EGGS_PER_BIOME, HALLOWEEN_EGG_RESPAWN, HALLOWEEN_FOG_NEAR/FAR.
- For fishing: addEgg(name, rarity) from halloweenEggs.js puts an egg in the backpack.
