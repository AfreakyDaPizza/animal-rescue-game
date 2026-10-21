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

## ✅ Issue #9 (2026-10-21)
- The 3 bosses were redrawn (`src/halloweenBosses.js`): Pumpkin Tyrant (carved pumpkin king, crown, fire, vine arms, cape, sceptre), Hollow Wraith (tattered fading cloak, hollow hood with glowing eyes, chains, soul lantern, ghost wisps), Bone Drake (skeleton dragon, green soul-fire in chest/mouth/eyes, bone wings that fold and flap).
- They get angry while chasing and roar when the chase starts (`userData.setMood`, called from `halloweenEggs.js`).
- Wild Halloween eggs: Legendary, Mythic and Eternal are half as likely (`HALLOWEEN_WILD_TOP_RARITY_MULT = 0.5` in balance.js). The lost chance goes to Common/Rare/Epic. Fishing odds are not changed.

## ✅ Built: nicer Ghost Vacuum + hearts (Issue #9, src/ghostVacuum.js)
- **Sucking looks cool now:** a spinning swirl beam comes out of the vacuum's nozzle. Rings and sparkles get pulled in. Glowing dots stream from the ghost into the nozzle. The vacuum shakes, glows and hums, and the hum gets higher as the ghost gets closer to caught.
- **A ghost in the beam stays still.** It stops floating around. It stretches toward the nozzle, wobbles and glows. It turns its face to you.
- **A progress bar** floats over the ghost ("Wraith Soul 54%"). It fills while you suck and slowly drains if the ghost slips out of the beam. Stronger ghosts still take longer.
- **Caught:** the ghost shrinks with a "whoosh", then goes POP. Soul Dust bursts out and gets sucked back into the vacuum.
- **Orbs don't take Soul Dust any more.** You have **5 ❤️** in the Ghost World. An orb hit takes 1 heart, the screen flashes red, and you get 1.2 s of safety. You get 1 heart back after 10 s without a hit. At 0 hearts you're **knocked out** and wake up at the Ghost World train stop with full hearts (plus 3 s of safety).
- Numbers in balance.js: GHOST_HEARTS = 5, GHOST_HEART_REGEN = 10, GHOST_HIT_SAFE = 1.2.

## ✅ Built: fishing v2 + 🌽 Candy Corn (Issues #8 #9, 2026-10-21; src/fishing.js, src/rodShop.js)
- The kid changed the rod rule: everybody has a **free Twig Rod**. Better rods cost **🌽 Candy Corn** and you **keep** them (saved in `state.rod`). Rods don't break any more.
- New currency `state.candyCorn` (also for the chest shop). A 🌽 pill shows in the HUD anywhere in the Halloween world.
- How fishing works now: E / click / USE at the dock or shore → ⚡ power bar goes up and down → press to cast (higher = farther cast, rarer eggs, more candy corn) → wait for the ❗ → press to hook → SPAM E / click / USE to fill the reel meter (it drains if you stop, the fish tugs back) → catch!
- What you catch: 60% 🌽 Candy Corn, 40% Halloween egg. Candy piles: Handful 70%, Big Pile 24%, CANDY MOUNTAIN 6% (more likely with a high cast). Rarer eggs and big piles are heavier, so you have to press more.
- BIG CATCH animation (flash, spinning rays, confetti, big text, fanfare) for Mythic/Eternal eggs and CANDY MOUNTAIN. Test it in the console: `game.fishing.testBig()`.
- Rod prices (🌽): 0, 30, 65, 125, 200, 350, 550, 900, 1500, 2500, 4000, 6000, 10000, 15000, 25000 (about 2.5 hours of fishing for all 15). All numbers in balance.js (`FISHING_*`).
- "Fishing stall not here": the Rod Shop was at z −20, which is exactly inside the tall cliff wall on the south edge of the Pumpkin Graveyard, so it was buried in rock. It moved to `ROD_SHOP = { x: HW_X − 32, z: 10 }` (just south of the dock), with its glowing sign, light beam, pumpkin-lamp path from the ruins, plus a new "🎣 FISH HERE!" sign and a blue beam at the end of the dock.
