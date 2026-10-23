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
};
export const WEAPON_ORDER = ['soulBlaster', 'candyPistol', 'slingshot', 'pumpkinLauncher', 'frostWand', 'lightningStaff', 'ghostShotgun', 'batBow'];

// 🗼 女巫塔：每次入塔得一支武器（TOWER_STARTER_WEAPON），打散殭屍有機會跌 📦 Weapon Crate（機會喺 balance.js TOWER_CRATE_CHANCE）
// 執到 = 抽一支新武器（weight 越大越易抽到）
export const TOWER_STARTER_WEAPON = 'candyPistol';
export const WEAPON_RARITY = {
  common: { name: 'Common', color: '#b0bec5', weight: 40 },
  rare: { name: 'Rare', color: '#40c4ff', weight: 26 },
  epic: { name: 'Epic', color: '#e040fb', weight: 13 },
  legendary: { name: 'Legendary', color: '#ffd740', weight: 6 },
};
