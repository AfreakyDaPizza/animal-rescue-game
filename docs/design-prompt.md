# 3D Endangered Animal Borrowing / Rescue Game — Design Prompt

> 原文（2026-10-10 由家長提供，小朋友嘅設計）。改設計時喺 `docs/` 另開新版本，唔好改呢份原稿。

I want to make a 3D educational stealth/action game where the player borrows endangered animals from dangerous environments and brings them back to a conservation hub. The core gameplay is similar to Steal an Egg, but the theme is rescue/conservation, not theft.

## Core Loop
1. Train Speed on the treadmill.
2. Train IQ at the student table.
3. Enter a biome and avoid hazards.
4. Borrow 1 random endangered animal from that biome.
5. If hit by a hazard, answer a wildlife question.
6. Escape back to the hub.
7. Put the borrowed animal into one of 5 Reproduce Machines.
8. Wait for the reproduction timer to finish to actually get the pet.
9. Place the pet on the Plot to earn money per second.
10. Use money to upgrade the treadmill and improve other systems.
11. Register the animal in the Animal Index.

## Map Layout — Upside-Down T
The overall map is shaped like an upside-down T (⊥).
- Bottom horizontal bar (_): The Hub. This contains the Plot, Treadmill, Student Table, Animal Index, 5 Reproduce Machines, and Inventory/Hotbar.
- Vertical stem (I): The biome path. This extends upward from the Hub and contains Biomes 1–5 in order.
- Biome order from bottom to top: Biome 1 → Biome 2 → Biome 3 → Biome 4 → Biome 5.
- The player starts at the Hub and travels upward along the stem to reach harder biomes.

## Border Walls
At the borders of the upside-down T are walls. These walls prevent the player from falling into the void outside the map. The walls follow the outer perimeter of the T shape:
- Along the bottom edge of the horizontal Hub bar
- Along the left and right ends of the Hub bar
- Along the top edges of the Hub bar, except where the vertical biome stem connects
- Along both sides of the vertical biome stem
- Across the top of the vertical stem, past Biome 5

The player cannot leave the T-shaped map area or fall off the edges.

## Hub / Base
The Hub is the bottom horizontal bar of the upside-down T. It contains:
- **Plot** — place animals here. Each animal earns money per second.
- **Treadmill** — trains Speed. Can be upgraded to train Speed faster/better.
- **Student Table** — trains IQ. Part of the core game.
- **Animal Index** — a core hub station like the Plot and Student Table. Tracks every species borrowed, its rarity, biome, facts, and completion progress. Gives rewards for filling it out.
- **5 Reproduce Machines** — no upgrades. Place a borrowed animal inside to eventually get the pet. The further the biome it came from, the longer reproduction takes.
- **Hotbar & Inventory** — hotbar for tools/items; inventory for animals, eggs, and resources.

## Tutorial
The game starts with a tutorial where the player borrows their first endangered animal. While borrowing it, the player must dodge obstacles like trash and polluted air. If hit, they must answer a wildlife question.

## Stats & Progression
- Player starts with 100 Speed and 100 IQ.
- Speed helps the player move, dodge, borrow animals, and escape.
- IQ helps with wildlife questions. Higher IQ makes questions easier.
- The further the biome, the harder the questions become.
- Treadmill can be upgraded to improve Speed training.

## Biomes & Endangered Animals
There are 5 biomes and 30 endangered animals total. Each biome has a pool of animals. Each run gives 1 random endangered animal from that biome. Every 5 minutes, it turns night and the biome resets.

| Biome | Boss | Boss stats | Animals |
|---|---|---|---|
| 1 — Deforestation Site | Lumberjack | 500 Speed, 200 IQ | Giant Panda, African Savanna Elephant, African Forest Elephant, Black Rhinoceros |
| 2 — Polluted Ocean | Factory Waste | 2,000 Speed, recommended 1,000 IQ | Manta Ray, Scalloped Hammerhead Shark, Blue Whale, Vaquita, Sea Turtle |
| 3 — Bird Poaching Site | Hunter | 30,000 Speed, recommended 45,000 IQ | Spix's Macaw, Philippine Eagle, Kakapo, Hyacinth Macaw, Sun Conure |
| 4 — Arctic Meltdown / Melting Ice Site | Oil Driller | 300,000 Speed, recommended 450,000 IQ | Polar Bear, Narwhal, Beluga Whale, Ringed Seal, Emperor Penguin, Arctic Fox, Caribou, Snowy Owl |
| 5 — Illegal Wildlife Trade Hub / Smuggler's Compound | Smuggler King | 2,000,000 Speed, recommended 3,000,000 IQ | Amur Leopard, Sumatran Orangutan, Bornean Orangutan, Mountain Gorilla, Javan Rhino, Sumatran Rhino, Saola, Pangolin |

## Hazards & Quiz System
Hazards include trash, polluted air, traps, poachers, vehicles, oil, smoke, cages, and other environmental dangers. If the player gets hit, they must answer a wildlife question. Further biomes have harder questions. IQ can make questions easier.

## Rarity System
Rarity order: Common → Rare → Epic → Legendary → Mythic

Spawn rates:
- Mythic: 2% chance
- Legendary: 15% chance
- Common / Rare / Epic: fill the remaining 83% and are effectively the default outcomes

## Reproduction System
- There are 5 Reproduce Machines. No upgrades for these machines.
- Once you borrow an animal, you must put it in a Reproduce Machine to actually get the pet.
- The further the biome the animal came from, the longer it takes to reproduce.
- Optional: rarity can also increase reproduction time.

## Theme & Tone
The game should be educational, urgent, and age-appropriate. The player is borrowing/rescuing animals to protect them, not stealing them. It should teach wildlife conservation and make the player feel like a rescuer.

## What I Need Help With
- Core game mechanics and controls
- Balancing the 5 biomes, bosses, Speed, and IQ progression
- Designing the Index system and completion rewards
- Plot money-per-second economy
- Hotbar and inventory design
- Quiz system design
- Reproduction timers and rarity spawn balance
- Designing the upside-down T map so the Hub and biome stem feel connected
- Designing the border walls so they naturally prevent falling into the void
- Art style, tone, and technical approach for a solo/small team

**Main change in this version:** Added border walls around the upside-down T. The walls follow the outer perimeter of the Hub bar and biome stem. They prevent the player from falling into the void outside the map.
