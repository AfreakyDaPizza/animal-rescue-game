// 🔫 魔法武器（Issue #11）：數值喺呢度改（小朋友可以喺 GitHub 改）
// 全部係魔法／糖果武器，射出嚟係發光嘅靈魂能量，唔係真槍
//
// id = 程式用嘅名（唔好改）· name = 遊戲顯示嘅名 · emoji = 快捷欄圖示
// damage = 每一下扣幾多 HP · auto = 揸住滑鼠一路射（true）定係撳一下射一下（false）
// fireRate = 每秒最多射幾多下 · mag = 一個彈匣有幾多發 · reload = 換彈要幾多秒
// spread = 唔準嘅角度（度，越細越準）· aimSpread = 開鏡之後嘅角度
// zoom = 開鏡（右鍵／AIM）放大幾多倍（1 = 冇鏡）
// recoil = 射一下鏡頭向上彈幾多（度）
// charge = 叉電（Slingshot）：揸住越耐越大力 { min 秒, max 秒, minDamage, maxDamage }
// projectile = 射出嚟係會飛嘅彈（唔係即中）：{ speed 米/秒, gravity 向下拉幾多 }
// color = 能量顏色（發光）
// sound = 射嘢聲（weapons.js 入面 addSounds 嘅名）
// rarity = 🗼 女巫塔 📦 Weapon Crate 有幾難抽到（common / rare / epic / legendary，見下面 WEAPON_RARITY）
// —— Issue #14 新加（全部可以冇）——
// pellets = 一下射幾粒（Ghost Shotgun）· range = 最遠打到幾遠（米，冇 = 160）
// projectile.splash = 爆炸半徑（米）+ splashDamage（爆炸扣幾多，中間最多）· projectile.homing = 識轉彎追敵人（越大轉得越快）
// projectile.model = 飛出去個樣（'pumpkin' 南瓜 · 'bat' 蝙蝠 · 冇 = 發光粒）· projectile.count = 一下射幾隻（Bat Bow 3 隻）
// slow = 打中令敵人慢落嚟 { mult 速度變幾多倍, time 秒 }（Frost Wand）
// chain = 閃電跳去附近敵人 { jumps 跳幾多次, range 米, falloff 每跳傷害 ×幾多 }（Lightning Staff）
// —— Issue #15 新加（小朋友 2026-10-25：「flamethrower、daggers、molotov、rocket launcher、angry spell」，全部可以冇）——
// cone = 噴火：每一下打中前面一個錐形入面所有敵人 { range 米, angle 錐形闊幾多度（中間去邊）}（Dragon Breath）
// fire = true：係火系武器（🌳 Skill Tree「Hot Hot Hot」加傷害）
// headMult = 打中個頭（爆擊位）傷害 ×幾多（冇 = 用敵人自己嘅，通常 1.5）
// projectile.fan = 幾支一齊飛出去時散開幾多度（每支之間）· projectile.stagger = 一支跟一支相隔幾多秒（冇 = 0.07）
// projectile.model = 加咗 'dagger' 飛刀 · 'potion' 藥水樽 · 'firework' 煙花火箭 · 'angryOrb' 嬲嬲波
// projectile.puddle = 落地留低一灘魔法火 { radius 米, time 燒幾多秒, tick 幾多秒扣一次, damage 每次扣幾多 }（Fire Potion）
// projectile.boomColors = 爆炸碎粒嘅顏色（煙花：好多色）· projectile.boomSound = 爆炸聲（冇 = 'pumpkinBoom'）
// projectile.maxRange = 最遠掟到幾遠（米）；地上會出個圈話你知會跌喺邊（Angry Spell、Fire Potion）
// angry = 打中／波及嘅敵人變嬲 { time 秒 }：佢會去打自己嘅朋友（Boss 唔會）
// spell = true：係法術（冷卻）：mag 用完就自動開始冷卻 reload 秒，收埋都照計；R 掣冇用（🌳「Spell Master」快啲）
export const WEAPONS = {
  soulBlaster: {
    id: 'soulBlaster', name: 'Soul Blaster', emoji: '💠',
    desc: 'Automatic soul-energy blaster. Hold to fire, right-click to scope!',
    damage: 100, auto: true, fireRate: 7, mag: 30, reload: 2.0,
    spread: 2.2, aimSpread: 0.25, zoom: 2.6, recoil: 0.9, color: 0x40ffd0,
    sound: 'blasterShot', rarity: 'epic',
  },
  candyPistol: {
    id: 'candyPistol', name: 'Candy Pistol', emoji: '🍭',
    desc: 'Fires sweet candy bolts. One click, one shot!',
    damage: 45, auto: false, fireRate: 5, mag: 12, reload: 1.2,
    spread: 1.2, aimSpread: 0.3, zoom: 1.6, recoil: 1.4, color: 0xff6ec7,
    sound: 'pistolShot', rarity: 'common',
  },
  slingshot: {
    id: 'slingshot', name: 'Spooky Slingshot', emoji: '🎯',
    desc: 'Hold to pull back, let go to fling a glowing pumpkin seed!',
    damage: 40, auto: false, fireRate: 2, mag: 8, reload: 1.6,
    spread: 0.8, aimSpread: 0.2, zoom: 1.4, recoil: 2, color: 0xffa726,
    charge: { min: 0.15, max: 1.2, minDamage: 40, maxDamage: 300 },
    projectile: { speed: 55, gravity: 14 },
    sound: 'slingShot', rarity: 'common',
  },
  // ---------- Issue #14：新魔法武器（淨係喺 🗼 女巫塔 📦 Weapon Crate 搵到，出咗塔就冇）----------
  pumpkinLauncher: {
    id: 'pumpkinLauncher', name: 'Pumpkin Launcher', emoji: '🎃',
    desc: 'Lobs glowing jack-o\'-lanterns that go BOOM in a big candy splash!',
    damage: 160, auto: false, fireRate: 1.1, mag: 4, reload: 2.2,
    spread: 0.6, aimSpread: 0.2, zoom: 1.3, recoil: 3.2, color: 0xff8f00,
    projectile: { speed: 32, gravity: 16, splash: 4, splashDamage: 220, model: 'pumpkin' },
    sound: 'pumpkinLaunch', rarity: 'legendary',
  },
  frostWand: {
    id: 'frostWand', name: 'Frost Wand', emoji: '❄️',
    desc: 'Hold to spray an icy beam. Frozen enemies move in slow-motion!',
    damage: 30, auto: true, fireRate: 12, mag: 48, reload: 1.8,
    spread: 0.9, aimSpread: 0.3, zoom: 1.4, recoil: 0.25, color: 0x80e8ff, range: 40,
    slow: { mult: 0.45, time: 2.2 },
    sound: 'frostZap', rarity: 'rare',
  },
  lightningStaff: {
    id: 'lightningStaff', name: 'Lightning Staff', emoji: '⚡',
    desc: 'Zap! Lightning jumps from one enemy to the next!',
    damage: 140, auto: false, fireRate: 2.4, mag: 10, reload: 1.9,
    spread: 0.5, aimSpread: 0.15, zoom: 1.5, recoil: 1.6, color: 0xffee58, range: 70,
    chain: { jumps: 4, range: 9, falloff: 0.75 },
    sound: 'lightningZap', rarity: 'legendary',
  },
  ghostShotgun: {
    id: 'ghostShotgun', name: 'Ghost Shotgun', emoji: '👻',
    desc: 'Blasts a spread of spooky spirit pellets. Get close!',
    damage: 40, auto: false, fireRate: 1.5, mag: 6, reload: 1.9, pellets: 8, range: 24,
    spread: 6.5, aimSpread: 4.5, zoom: 1.2, recoil: 4, color: 0xb9f6ff,
    sound: 'ghostBlast', rarity: 'rare',
  },
  batBow: {
    id: 'batBow', name: 'Bat Swarm Bow', emoji: '🦇',
    desc: 'Shoots 3 magic bat arrows that fly after enemies by themselves!',
    damage: 70, auto: false, fireRate: 1.6, mag: 5, reload: 1.7,
    spread: 4, aimSpread: 2.5, zoom: 1.4, recoil: 1.2, color: 0xd05cff,
    projectile: { speed: 26, gravity: 0, homing: 5, model: 'bat', count: 3 },
    sound: 'batScreech', rarity: 'epic',
  },
  // ---------- Issue #15（小朋友 2026-10-25）：再多 5 支魔法武器（都係喺 📦 Weapon Crate 搵）----------
  dragonBreath: {
    id: 'dragonBreath', name: 'Dragon Breath', emoji: '🐉',
    desc: 'Hold to breathe magic dragon fire! Short range, burns every zombie in front of you.',
    damage: 24, auto: true, fireRate: 10, mag: 60, reload: 2.4, range: 9,
    cone: { range: 9, angle: 16 }, fire: true,
    spread: 0, aimSpread: 0, zoom: 1.15, recoil: 0.12, color: 0xff7a1a,
    sound: 'dragonFlame', rarity: 'epic',
  },
  spiritDaggers: {
    id: 'spiritDaggers', name: 'Spirit Daggers', emoji: '🗡️',
    desc: 'Throw 3 glowing ghost daggers at once! Aim for the HEAD for huge damage.',
    damage: 55, auto: false, fireRate: 2.6, mag: 9, reload: 1.1, headMult: 2.2,
    spread: 0.6, aimSpread: 0.2, zoom: 1.4, recoil: 0.8, color: 0x7cf9ff,
    projectile: { speed: 70, gravity: 2, model: 'dagger', count: 3, fan: 4, stagger: 0 },
    sound: 'daggerThrow', rarity: 'rare',
  },
  firePotion: {
    id: 'firePotion', name: 'Fire Potion', emoji: '🧪',
    desc: 'Lob a potion! It smashes into a puddle of magic fire that burns zombies standing in it.',
    damage: 40, auto: false, fireRate: 1.4, mag: 3, reload: 2.0, fire: true,
    spread: 0.5, aimSpread: 0.2, zoom: 1.2, recoil: 1.2, color: 0xff5a1f,
    projectile: { speed: 24, gravity: 18, splash: 2.6, splashDamage: 70, model: 'potion', maxRange: 26, boomSound: 'potionSmash', boomColors: [0xff6d00, 0xffd54f, 0xff1744], puddle: { radius: 3, time: 4, tick: 0.4, damage: 32 } },
    sound: 'potionThrow', rarity: 'rare',
  },
  fireworkLauncher: {
    id: 'fireworkLauncher', name: 'Firework Launcher', emoji: '🎆',
    desc: 'Fires a sparkly firework rocket that bursts into a HUGE rainbow explosion!',
    damage: 120, auto: false, fireRate: 1, mag: 3, reload: 2.6, fire: true,
    spread: 0.3, aimSpread: 0.1, zoom: 1.5, recoil: 3.6, color: 0xff4fd8,
    projectile: { speed: 46, gravity: 0, splash: 5, splashDamage: 280, model: 'firework', boomSound: 'fireworkBoom', boomColors: [0xff1744, 0xffea00, 0x00e5ff, 0x76ff03, 0xd500f9, 0xff9100] },
    sound: 'fireworkLaunch', rarity: 'legendary',
  },
  angrySpell: {
    id: 'angrySpell', name: 'Angry Spell', emoji: '😡',
    desc: 'Throw a grumpy spell! Zombies it hits get ANGRY and attack their friends. Needs 15 s to recharge.',
    damage: 10, auto: false, fireRate: 1, mag: 1, reload: 15, spell: true,
    angry: { time: 8 },
    spread: 0, aimSpread: 0, zoom: 1.2, recoil: 1, color: 0xff2d55,
    projectile: { speed: 22, gravity: 16, splash: 5, splashDamage: 10, model: 'angryOrb', maxRange: 30, boomSound: 'angryBoom', boomColors: [0xff1744, 0xff8a80, 0x880e4f] },
    sound: 'angryCast', rarity: 'epic',
  },
};
export const WEAPON_ORDER = ['soulBlaster', 'candyPistol', 'slingshot', 'pumpkinLauncher', 'frostWand', 'lightningStaff', 'ghostShotgun', 'batBow', 'dragonBreath', 'spiritDaggers', 'firePotion', 'fireworkLauncher', 'angrySpell'];

// 🗼 女巫塔：每次入塔得一支武器（TOWER_STARTER_WEAPON），打散殭屍有機會跌 📦 Weapon Crate（機會喺 balance.js TOWER_CRATE_CHANCE）
// 執到 = 抽一支新武器（weight 越大越易抽到）
export const TOWER_STARTER_WEAPON = 'candyPistol';
export const WEAPON_RARITY = {
  common: { name: 'Common', color: '#b0bec5', weight: 40 },
  rare: { name: 'Rare', color: '#40c4ff', weight: 26 },
  epic: { name: 'Epic', color: '#e040fb', weight: 13 },
  legendary: { name: 'Legendary', color: '#ffd740', weight: 6 },
};
