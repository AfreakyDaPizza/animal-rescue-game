// 🍀 LUCK MACHINE + LUCK TRAILS (Issue #21, kid 2026-11-09 / 2026-11-14) — you can change these numbers!
// Buy a trail at the Luck Machine (Hub, by the wall next to the Magic Library). Equip ONE trail at a time.
// luck = how much MORE often Legendary, Mythic and Eternal wild animals appear (2 = twice as often).
// cost = 💰 money. You keep every trail you buy.
// colors = the trail's colours from the front to the back (2 or more). rainbow: true = all the colours.

export const TRAILS = [
  { id: 'grey', name: 'Grey Trail', luck: 2, cost: 250000, colors: ['#eceff1', '#90a4ae'] },
  { id: 'green', name: 'Green Trail', luck: 4, cost: 5000000, colors: ['#b9f6ca', '#00c853'] },
  { id: 'blue', name: 'Blue Trail', luck: 6, cost: 100000000, colors: ['#80d8ff', '#2962ff'] },
  { id: 'purple', name: 'Purple Trail', luck: 8, cost: 1000000000, colors: ['#ea80fc', '#7c4dff'] },
  { id: 'golden', name: 'Golden Trail', luck: 10, cost: 10000000000, colors: ['#fff59d', '#ffab00'] },
  { id: 'red', name: 'Red Trail', luck: 12, cost: 50000000000, colors: ['#ff8a80', '#d50000'] },
  { id: 'galaxy', name: 'Galaxy Trail', luck: 15, cost: 200000000000, colors: ['#18ffff', '#7c4dff', '#311b92', '#ea80fc'], stars: true },
  { id: 'rainbow', name: 'Rainbow Trail', luck: 18, cost: 1000000000000, colors: ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'], rainbow: true },
];

export const findTrail = (id) => TRAILS.find((t) => t.id === id) || null;
// Your luck right now (1 = no trail)
export const trailLuck = (id) => findTrail(id)?.luck || 1;
