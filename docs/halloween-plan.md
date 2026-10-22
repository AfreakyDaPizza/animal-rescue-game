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
- ~~Use a shard on your Plot. Each pet has a **25% chance** to get hit.~~ Changed by Issue #10 (2026-10-21): the shard goes into your **🎒 Inventory** (press `` ` ``) as a **Gear**. Use it, then **pick one pet** in the Animals tab: it **always** works on that pet.
- The pet becomes 50/50 **👻 Spectral (×4)** or **🌑 Phantom (×5)** (if it already has one, it gets the other).
- **Animation** (when the pet you pick is on your Plot; a pet in your backpack sparkles in the Inventory instead): the pets on the Plot disappear, the Halloween portal takes the chosen pet away, then sends it back with its mutation (like Steal an Egg's mutation mechanic).

## 🎒 Inventory (Issue #10, 2026-10-21)
- Press `` ` `` (or the 🎒 button). 3 tabs: **Animals** (magical, Halloween, chest and Fuse pets), **Endangered Animals** (real animals: rescued ones and pets), **Gears** (🔮 Halloween Shard, ☄️ Meteoric Shard).
- Drag a card onto the hotbar (on a phone: tap the card, then tap a slot). Drag a slot back up to take it off.
- ☄️ **Meteoric Shard** → ☄️ METEORIC (×5, blue glow + little meteors). 🌌 **ASTRAL** (×8, purple stars) comes from the Meteoric Chest.

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

## ✅ Built: abandoned Ghost Town + scarier music (2026-10-22)
The kid asked: "make the ghost town more abandoned town vibe" and "make more scary music".
- **Ghost World = an abandoned ghost town** (`src/ghostTown.js`, layout in `GHOST_TOWN` in `src/halloweenShape.js`):
  - A cracked cobbled main street (train stop → Statue square → leaning clock-tower chapel with a stopped clock, 11:58) and a cross street.
  - Crooked, boarded-up houses and shops with broken windows: SALOON (swinging "OLD SALOON" sign), HOTEL, GENERAL STORE ("WANTED: GHOSTS" poster), BARBER, BANK, BLACKSMITH, POST OFFICE, DEPOT. Some windows glow faint green with a little ghost peeking out.
  - Broken street lamps (some flicker or go dark, some bent or fallen), a rusty water tower, broken picket fences around the island, dead trees, a small Boot Hill graveyard, abandoned carts, barrels, crates, cobwebs, crows (sitting on roofs and flying in circles), tumbleweeds rolling down the streets, fog drifting along the streets, lightning in the distance.
  - A "WELCOME TO GHOST TOWN — Population: 0 ... just ghosts!" sign at the train stop.
  - Houses are solid (`hwWalkable` checks `GHOST_TOWN.blocks`). Ghosts only appear and float in open space: streets, square, back yards (`ghostOpen` / `ghostPathClear`, used in `src/ghostVacuum.js`). The train stop, Statue of Halloween, vacuum shop and the knock-out respawn are unchanged.
  - Fewer tumbleweeds / fog patches / flying crows at lower graphics quality (G key).
- **Scarier music** (`src/sound.js`, all synthesised):
  - 🎃 Halloween world (`'spooky'`): D minor lullaby on an old music box, soft pads, plucked bass, a low detuned drone, wind, and now and then an owl, a creaky door or a far-away bell.
  - 👻 Ghost World (`'ghost'`): slower, diminished chords, a deeper drone with a spooky interval, an out-of-tune music box that sometimes "runs down", a soft heartbeat every bar, whispers (no words), creaks, crows and the clock-tower bell.
  - Going in or out of these worlds, the music fades out and the new song fades in (about 1 s). Normal-world music is the same as before. Mute (N) still mutes everything.

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

## ✅ Built: 🎯 aim your cast + the line really connects (Issue #10, 2026-10-21; src/fishing.js)
- **The fishing line now starts exactly at the rod tip** (first person and third person, every rod, even while it bends). Why it didn't before: in third person the arm holding the rod was moved *after* the line was drawn, so the line used the tip of a rod hanging down by your side (about 3 metres away). Now the rod is posed first, and the line is placed again right before each picture is drawn, so it can never fall behind.
- **You choose where to fish:** while the ⚡ power bar goes up and down, a glowing 🎯 ring on the water (plus a dotted arc) shows where the bobber will land: the middle of your screen. The power bar sets how far you can throw: empty bar = 6 m, full bar = 22 m (`FISHING_CAST_RANGE` in balance.js). Aim closer and it lands right where you look.
- Look at land or the dock → the ring turns **orange** and moves to the nearest water. You can fish from anywhere on the dock or along the lake shore, not only the end of the dock. Phones: drag the screen to aim, tap USE.

## ✅ Built: 🐕 Echo + 🧟 Zombified Chest (Issue #8, 2026-10-21)
- **Echo** was a cute zombie dog at first (2026-10-22: now a ghost dog, see below) (green fur, glowing green eyes, purple stitches, a bandaged leg and a taped floppy ear, wagging tail). He stands on the counter of his little stall in the north-east of the Spawn Ruins, so you see him as soon as you arrive. He looks at you, tilts his head and does a happy hop now and then.
- Press **E** at the stall to open the shop: your 🍬 Candy Corn, the chest price and what's inside (with chances).
- **Zombified Chest** costs **500 Candy Corn** (`ZOMBIE_CHEST_COST`). What's inside (`ZOMBIE_CHEST_DROPS` in balance.js):
  - Candy Corn (Common) 51%. The kid hasn't said how much, so for now it's a random **250–750** (`ZOMBIE_CHEST_CANDY`).
  - Hollow Bat (Rare) 24%
  - Scarecrow (Epic) 18%
  - Pumpkin Golem (Legendary) 6%
  - Soul Phantom (Mythic) 1%
- **Opening animation:** the chest drops from the sky, shakes harder and harder and glows in the rarity colour, then bursts open with a flash and a light beam. Your prize rises out with big text. Legendary is bigger. **Mythic** is extra big: the screen goes dark, the chest floats, rainbow rings spin, the text is rainbow and the camera circles around.
- The chest gives the **pet straight into your backpack** (no egg to hatch), like a pet that just hatched. The 4 chest pets only come from the chest (no eggs, no fishing). In the Index they have their own "🧟 Zombified Chest" part. They earn money like Abandoned Manor pets (biome 9).
- Code: `src/echoShop.js` (Echo, stall, shop, animation), `src/echoPetModels.js` (the 4 pet models), `src/data/echoChest.js` (pet data + chest roll).
- Testing (dev console): `game.candy(5000)` gives Candy Corn; `game.echo.open('Soul Phantom')` plays the animation with that prize (free).

## ✅ Built: 👻🐕 Echo is a ghost dog + 🐾 Echo's Questline (kid, 2026-10-22)
- **Echo is now a ghost dog:** see-through, glowing pale-cyan body, glowing cyan eyes, floppy ears, a little blue ghost flame on his head, and his purple collar with the candy-corn tag. He has 2 floaty front paws; instead of back legs his body fades into a wispy ghost tail that wags, with tiny sparkles trailing from the tip. He floats up and down over the counter (both stalls).
- **Echo's Questline stall** is in the north-west of the Spawn Ruins (opposite Echo's Chest Shop). Ghost-blue stall, glowing paw prints, a notice board with 10 quest papers (green = done, glowing = the one you're on), and Echo floating there too. Press **E** to see today's 10 quests.
- **Opens on 24 October** (`ECHO_QUESTS_OPEN_DATE` in balance.js). Before that the sign says "🔒 Opens on 24 Oct (in N days)". Test switch: `state.echoQuestsEarly`.
- **10 quests in a row, one at a time.** Each is harder with a better prize. Every day at midnight (your own clock) you start again from quest 1. Quests + prizes are `ECHO_QUESTS` in balance.js:
  1. 🎣 Catch 3 things at the Fishing Lake → 🌽 150 Candy Corn
  2. 🌽 Fish up 50 Candy Corn → 🌽 400 + 🎟️ 3 Skin Tokens
  3. 🥚 Grab a wild egg in a spooky biome → 🧟 1 Zombified Chest + 💰 $50K
  4. 🏃 Bring 2 eggs back to the Spawn Ruins → 💀 600 Soul Dust + 🎟️ 5
  5. 🐣 Hatch 2 eggs at the Egg Graveyard → 🔮 1 Halloween Shard + 🌽 800
  6. 🚂 Ride the Phantom Express → 🧟 2 + 💰 $250K
  7. 👻 Catch 20 ghosts with your vacuum → 🔮 2 + 🌽 1,500 + 🎟️ 10
  8. 🗿 Trade for 3 Halloween Shards at the Statue → 🧟 3 + 💀 2,000 + 🎟️ 15
  9. 🌫️ Escape the Hollow Wraith (bring back a Hollow Sprites egg) → 🧟 5 + 🔮 3 + 💰 $2M + 🎟️ 20
  10. 🐉 Escape the Bone Drake (bring back an Abandoned Manor egg) → **Mythic Soul Phantom pet** + 🧟 10 + 🔮 5 + 🌽 5,000 + 🎟️ 50
- A small tracker on the left (only in the Halloween world) shows your quest and a progress bar. When you finish one, a **QUEST COMPLETE!** card pops up with confetti: click **Claim** or press **Enter**.
- Code: `src/questline.js` (counting + prizes, `state.echoQuests = { day, index, progress, claimed }`), `src/echoQuestStall.js` (stall, panel, tracker, card), Echo's model in `src/echoShop.js` (`buildEcho`).
- Testing (dev console): `game.questline.open()` opens it early; `game.questline.finish()` finishes the current quest; `game.questline.jump(9)` goes to quest 10; `game.questline.track('ghostCatch', 5)`.

## ✅ Built: 🗺️ World Expedition + 🔥 Halloween World 2: Hell (Issue #11, 2026-10-22)
- **🗺️ World Expedition map** (`src/worldExpedition.js`): a big glowing map board in the Spawn Ruins (south-east, `EXPEDITION_MAP` = HW_X+12, z 9). It shows World 1 (Halloween) and World 2 (Hell). Press E:
  - World 2 is locked: "🍬 Soul Candy 3/5 — beat the Pumpkin Reaper Dragon in the Abandoned Manor". When you have 5, the Unlock button uses 5 Soul Candy (`state.soulCandy`, `state.world2Unlocked`).
  - Then "🔥 Travel to Hell" (new red loading screen, theme `hell` in `src/loading.js`).
- **🔥 Hell** (`src/hellShape.js` = map and numbers, `src/hellWorld.js` = looks): far away at x ≈ -2600. Lava sea that flows and glows, dark red sky, ash and embers, black spikes, big chains, fire geysers.
  - **Parkour:** 23 flying lava rocks (`HELL_ROCKS`). Some slide, some float up and down, some spin and carry you around, some fly in circles. 5 🚩 checkpoints (the 5th is the castle landing). Fall in the lava → "🔥 HOT HOT HOT!" and you go back to your last checkpoint (nothing is lost).
  - The slowest player (Speed 100) can jump about 4.5 m; the rocks are at most 2.6 m apart when they are closest. A test robot finished the whole path.
  - 🌀 Portals back to the Halloween World on the first island and in the castle courtyard.
- **🏰 Witch Castle:** a dark castle with a courtyard, 🧙‍♀️ the Witch (pointy hat, bubbling cauldron, black cat, speech bubbles). Press E to talk → she tells you about her **🗼 Witch Tower** (east of the castle) and lights a glowing path to its door (`state.witchMet`).
  - The tower door: for now it says "🗼 The Witch Tower — coming next!". For the next helper: `setWitchTowerEntry(fn)` from `src/hellWorld.js`, or `window.__enterWitchTower = fn`.
- Control Panel: Teleport → "World Expedition map" and "Hell (World 2)"; Unlocks → "Halloween World 2 (Hell) unlocked"; Give → 🍬 Soul Candy.

## ✅ Built: 🐉 Pumpkin Reaper Dragon + 🔫 magic weapons (Issue #11, 2026-10-22)
- **When:** every hour on the real clock at **:30** (the Phantom Express is at :00), so everybody sees it at the same time. A **red warning** shows 1 minute before: "⚠️ The PUMPKIN REAPER DRAGON awakens in the Abandoned Manor!". Then the dragon stays awake for **10 minutes** (a red pill shows the time left).
- **Getting in:** the 🏚️ Abandoned Manor's front door glows red-orange (with a red beacon and a sign). Walk up the steps into the door (or press E) → loading screen → a **broken manor hall** (torn purple wallpaper, moonlit windows with torn curtains, broken roof beams, cracked pillars with green ghost-fire, candles, a fallen chandelier, crooked paintings with glowing eyes).
- **No Soul Blaster yet?** You get one **free** when you walk in, and you keep it.
- **Intro:** the floor shakes and cracks glow orange, then the dragon **bursts up through the floor** (planks fly everywhere) and roars.
- **The dragon** stays in its hole in the middle and turns to face you. It has a glowing carved pumpkin head with dragon horns and a reaper hood, a giant scythe, torn bat wings, lava cracks on its chest and a purple-green fog aura. **10,000 HP.** Shooting the 🎃 head does ×1.5 damage.
- **Attacks** (a new one every ~2.4 s, faster when it's ANGRY below half HP):
  - 🌀 **Scythe throw:** it flies out in a boomerang loop and comes back. Move out of its path!
  - 🔥 **Fire breath:** a red cone on the floor shows where it will breathe. Getting hit **flings you away**.
  - 🎃 **Pumpkin bombs:** red circles on the floor show where they will land.
  - 🐟 **Ghost fish** pop out of the floor, chase you and bite. Shoot them (300 HP each).
- **Hearts:** you have 5 ❤️ (each hit takes 1, 1 comes back after 12 s with no hits). At 0 hearts you are thrown out of the manor; the dragon **keeps its lost HP** until its 10 minutes are over, so you can go back in and finish it. The 🚪 EXIT door at the back of the hall (press E) also takes you out.
- **Win:** a big death animation (light beams burst out, explosions, it sinks back into the hole) → **🍬 +1 Soul Candy** (`state.soulCandy`, shown next to 🌽 Candy Corn in the stats box) → back to the Spawn Ruins. You can beat it once per hour.
- **Numbers:** `REAPER_*` in balance.js (time, HP, hearts, bombs, fish, push, reward…).
- **Control Panel:** 🎉 Events → "🐉 Summon Pumpkin Reaper Dragon" (5 s warning, then it wakes up); 💰 Give → 🍬 Soul Candy.
- **Test in the console:** `game.reaper.spawn(seconds)`, `game.reaper.goto()`, `game.reaper.attack('scythe'|'fire'|'bombs'|'fish')`, `game.reaper.hurt(9000)`, `game.reaper.kill()`, `game.reaper.god = true`, `game.reaper.calm = true`.

### 🔫 Weapons (src/weapons.js, numbers in src/data/weapons.js)
- 💠 **Soul Blaster** (the kid's "AK-47", but magic): automatic, **100 damage**, 30-shot crystal magazine, 2 s reload, scope (×2.6 zoom).
- 🍭 **Candy Pistol:** one click = one shot, 45 damage, 12 shots.
- 🎯 **Spooky Slingshot:** hold to pull back, let go to fling a glowing pumpkin seed (40–300 damage), it falls a bit.
- Controls: **left click** shoot (hold for the Soul Blaster), **right click** aim / scope, **R** reload (it also reloads by itself when empty). Phones: **FIRE / AIM / RELOAD** buttons.
- Weapons only show up in the hotbar inside fight areas (the manor hall now, the Endless Tower next). Crosshair, ammo box, hit markers, damage numbers, muzzle flash, recoil and reload animation are built in.
