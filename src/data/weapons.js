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
export const WEAPONS = {
  soulBlaster: {
    id: 'soulBlaster', name: 'Soul Blaster', emoji: '💠',
    desc: 'Automatic soul-energy blaster. Hold to fire, right-click to scope!',
    damage: 100, auto: true, fireRate: 7, mag: 30, reload: 2.0,
    spread: 2.2, aimSpread: 0.25, zoom: 2.6, recoil: 0.9, color: 0x40ffd0,
  },
  candyPistol: {
    id: 'candyPistol', name: 'Candy Pistol', emoji: '🍭',
    desc: 'Fires sweet candy bolts. One click, one shot!',
    damage: 45, auto: false, fireRate: 5, mag: 12, reload: 1.2,
    spread: 1.2, aimSpread: 0.3, zoom: 1.6, recoil: 1.4, color: 0xff6ec7,
  },
  slingshot: {
    id: 'slingshot', name: 'Spooky Slingshot', emoji: '🎯',
    desc: 'Hold to pull back, let go to fling a glowing pumpkin seed!',
    damage: 40, auto: false, fireRate: 2, mag: 8, reload: 1.6,
    spread: 0.8, aimSpread: 0.2, zoom: 1.4, recoil: 2, color: 0xffa726,
    charge: { min: 0.15, max: 1.2, minDamage: 40, maxDamage: 300 },
    projectile: { speed: 55, gravity: 14 },
  },
};
export const WEAPON_ORDER = ['soulBlaster', 'candyPistol', 'slingshot'];
