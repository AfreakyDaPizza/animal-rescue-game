// 跑步機屏幕上嘅短片（好似 Shorts／TikTok）：又搞笑又學到嘢
// 全部用 canvas 畫：郁動嘅 emoji + 標題 + 字幕。企喺跑步機上面轆滑鼠就碌去下一條。

import * as THREE from 'three';

const W = 640;
const H = 372;

// emoji 畫一次就記住（之後直接貼圖，快好多）
const emojiCache = new Map();
function emojiImage(char, size) {
  const key = `${char}@${size}`;
  if (!emojiCache.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * 1.4);
    const cx = c.getContext('2d');
    cx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(char, c.width / 2, c.height / 2);
    emojiCache.set(key, c);
  }
  return emojiCache.get(key);
}

// 畫一個會郁嘅 emoji
function emoji(ctx, char, x, y, size, rot = 0, alpha = 1) {
  const img = emojiImage(char, Math.max(10, Math.round(size / 5) * 5));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

const bounce = (t, speed = 6, h = 20) => -Math.abs(Math.sin(t * speed)) * h;

// 每條片：title、caption（真知識）、colors（背景）、draw(ctx, t)（t = 播咗幾多秒）
export const VIDEOS = [
  {
    title: 'Panda Poop Party',
    caption: 'Giant pandas can poop up to 40 times a day! Bamboo goes in... and comes out fast!',
    colors: ['#a5d6a7', '#43a047'],
    draw(ctx, t) {
      emoji(ctx, '🎋', 130, 170, 90, Math.sin(t * 2) * 0.1);
      emoji(ctx, '🐼', 320, 170 + bounce(t, 5, 15), 120);
      const count = Math.min(40, Math.floor(t * 5));
      for (let i = 0; i < Math.min(count, 8); i++) emoji(ctx, '💩', 420 + (i % 4) * 45, 230 - Math.floor(i / 4) * 45, 40, Math.sin(t * 8 + i) * 0.2);
      bigText(ctx, `${count} 💩`, 520, 110, '#5d4037');
    },
  },
  {
    title: 'Trunk Power!',
    caption: "An elephant's trunk has about 40,000 muscles. Your whole body has about 600!",
    colors: ['#cfd8dc', '#78909c'],
    draw(ctx, t) {
      emoji(ctx, '🐘', 230, 175, 150, Math.sin(t * 3) * 0.08);
      emoji(ctx, '💪', 430, 150 + bounce(t, 4, 25), 80, Math.sin(t * 6) * 0.3);
      bigText(ctx, `${Math.min(40000, Math.floor(t * 9000)).toLocaleString('en-US')}`, 470, 250, '#263238');
    },
  },
  {
    title: "Polar Bear's Secret",
    caption: "Polar bear fur isn't really white - each hair is see-through! The skin underneath is black.",
    colors: ['#e1f5fe', '#81d4fa'],
    draw(ctx, t) {
      const reveal = (Math.sin(t * 1.5) + 1) / 2;
      ctx.fillStyle = `rgba(0,0,0,${reveal * 0.85})`;
      ctx.fillRect(220, 90, 200, 170);
      emoji(ctx, '🐻‍❄️', 320, 175, 140, 0, 1 - reveal * 0.6);
      emoji(ctx, '🔍', 450 + Math.sin(t * 2) * 30, 140, 70);
      emoji(ctx, '😲', 130, 170 + bounce(t, 3, 10), 70);
    },
  },
  {
    title: 'Unicorn of the Sea',
    caption: "A narwhal's long 'horn' is actually a TOOTH! It can grow up to 3 metres long.",
    colors: ['#b3e5fc', '#0277bd'],
    draw(ctx, t) {
      emoji(ctx, '🦄', 160, 120 + Math.sin(t * 2) * 15, 80, -0.2);
      emoji(ctx, '🐋', 340 + Math.sin(t * 1.5) * 40, 200, 130);
      emoji(ctx, '🦷', 520, 140 + bounce(t, 5, 20), 70, t * 2);
      emoji(ctx, '❓', 160, 230, 50, Math.sin(t * 4) * 0.3);
    },
  },
  {
    title: 'Best Dad Ever',
    caption: 'Emperor penguin dads keep their egg warm on their feet for about 2 months - without eating!',
    colors: ['#e3f2fd', '#5c6bc0'],
    draw(ctx, t) {
      emoji(ctx, '🐧', 320, 150 + Math.sin(t * 4) * 5, 140, Math.sin(t * 4) * 0.12);
      emoji(ctx, '🥚', 320, 255, 50, Math.sin(t * 4) * 0.12);
      for (let i = 0; i < 6; i++) emoji(ctx, '❄️', ((i * 120 + t * 60) % W), ((i * 70 + t * 80) % H), 30, t);
      emoji(ctx, '🏆', 520, 150 + bounce(t, 3, 12), 70);
    },
  },
  {
    title: "Kakapo: Can't Fly, Can Climb!",
    caption: 'The kakapo is a parrot that cannot fly. It climbs trees and uses its wings like a parachute to float down!',
    colors: ['#dcedc8', '#689f38'],
    draw(ctx, t) {
      emoji(ctx, '🌳', 180, 160, 190);
      const k = (t * 0.4) % 1;
      emoji(ctx, '🦜', 240 + k * 230, 100 + k * 160, 80, k * 0.5);
      emoji(ctx, '🪂', 240 + k * 230, 50 + k * 160, 50, 0, k > 0.1 ? 1 : 0);
    },
  },
  {
    title: 'Is the Turtle Crying?',
    caption: 'Sea turtles look like they cry - but it is extra salt from the sea water leaving their body!',
    colors: ['#b2dfdb', '#00897b'],
    draw(ctx, t) {
      emoji(ctx, '🐢', 320, 180, 150, Math.sin(t * 1.5) * 0.08);
      const d = (t * 1.2) % 1;
      emoji(ctx, '💧', 275, 160 + d * 70, 35, 0, 1 - d);
      emoji(ctx, '🧂', 500, 150 + bounce(t, 4, 15), 70);
    },
  },
  {
    title: 'Owl Head Spin',
    caption: 'Owls cannot move their eyes, so they can turn their heads about 270 degrees instead!',
    colors: ['#f5f5f5', '#9e9e9e'],
    draw(ctx, t) {
      emoji(ctx, '🦉', 320, 180, 150, Math.sin(t * 2) * 2.3);
      emoji(ctx, '🔄', 500, 120, 60, t * 3);
      emoji(ctx, '👀', 140, 120 + bounce(t, 3, 10), 60);
    },
  },
  {
    title: 'The Plastic Problem',
    caption: 'A plastic bottle can take hundreds of years to break down. Use a refillable bottle instead!',
    colors: ['#b3e5fc', '#0288d1'],
    draw(ctx, t) {
      emoji(ctx, '🥤', 140 + Math.sin(t * 2) * 20, 140 + Math.sin(t * 3) * 10, 70, Math.sin(t) * 0.5);
      emoji(ctx, '🐟', 330 + Math.sin(t * 1.5) * 60, 220, 70, 0);
      emoji(ctx, '😟', 330 + Math.sin(t * 1.5) * 60, 160, 40);
      emoji(ctx, '♻️', 520, 150 + bounce(t, 3, 15), 80, t);
    },
  },
  {
    title: 'Biggest Heart in the World',
    caption: "A blue whale's heart weighs about as much as a big motorbike - the biggest heart of any animal!",
    colors: ['#bbdefb', '#1565c0'],
    draw(ctx, t) {
      emoji(ctx, '🐋', 230, 190, 160);
      const beat = 1 + Math.max(0, Math.sin(t * 6)) * 0.25;
      emoji(ctx, '💙', 470, 160, 80 * beat);
      emoji(ctx, '🏍️', 470, 270, 50);
    },
  },
  {
    title: 'Super Long Tongue',
    caption: "A pangolin's sticky tongue can be up to 40 cm long - longer than a ruler! Perfect for slurping ants.",
    colors: ['#ffe0b2', '#ef6c00'],
    draw(ctx, t) {
      emoji(ctx, '🦔', 160, 190, 120);
      const len = (Math.sin(t * 3) + 1) / 2;
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(215, 205);
      ctx.lineTo(215 + len * 260, 205 + Math.sin(t * 9) * 8);
      ctx.stroke();
      for (let i = 0; i < 5; i++) emoji(ctx, '🐜', 330 + i * 50, 240, 30, 0, len * 260 > (i * 50 + 120) ? 0.2 : 1);
    },
  },
  {
    title: 'Arctic Fox Snow Dive',
    caption: 'Arctic foxes can hear mice moving UNDER the snow - then they jump and dive in head-first!',
    colors: ['#eceff1', '#90a4ae'],
    draw(ctx, t) {
      const k = (t * 0.5) % 1;
      const x = 150 + k * 300;
      const y = 200 - Math.sin(k * Math.PI) * 140;
      emoji(ctx, '🦊', x, y, 90, k * 2 - 0.5);
      emoji(ctx, '❄️', 470, 270, 60);
      emoji(ctx, '🐭', 500, 290, 35, 0, k > 0.85 ? 0.3 : 1);
      emoji(ctx, '👂', 120, 110, 50, Math.sin(t * 5) * 0.2);
    },
  },
  {
    title: 'Red Panda Fake Thumb',
    caption: 'Red pandas have a special "fake thumb" on their wrist to hold bamboo while they munch!',
    colors: ['#ffccbc', '#d84315'],
    draw(ctx, t) {
      emoji(ctx, '🦝', 260, 180 + bounce(t, 3, 10), 130);
      emoji(ctx, '👍', 420, 140, 70, Math.sin(t * 4) * 0.4);
      emoji(ctx, '🎋', 480, 230, 70, Math.sin(t * 2) * 0.2);
    },
  },
  {
    title: 'Walrus Whisker Power',
    caption: 'Walruses have hundreds of super-sensitive whiskers to find clams on the dark sea floor!',
    colors: ['#d7ccc8', '#6d4c41'],
    draw(ctx, t) {
      emoji(ctx, '🦭', 260, 170, 140, Math.sin(t * 2) * 0.1);
      for (let i = 0; i < 4; i++) emoji(ctx, '🦪', 400 + i * 50, 250 + Math.sin(t * 3 + i) * 8, 40);
      emoji(ctx, '🔦', 480, 120, 50, Math.sin(t * 2) * 0.5);
    },
  },
  {
    title: 'Okapi Ear Cleaning',
    caption: 'An okapi\'s tongue is so long it can clean its own eyelids and ears. Gross... but cool!',
    colors: ['#efebe9', '#795548'],
    draw(ctx, t) {
      emoji(ctx, '🦓', 300, 180, 140);
      emoji(ctx, '👅', 380 + Math.sin(t * 4) * 20, 120 - Math.abs(Math.sin(t * 4)) * 30, 50, Math.sin(t * 4));
      emoji(ctx, '👂', 420, 90, 45);
      emoji(ctx, '🤢', 130, 130 + bounce(t, 3, 8), 55);
    },
  },
  {
    title: 'Slooooow Loris',
    caption: 'Slow lorises move slowly and quietly so predators do not notice them. Never buy one as a pet!',
    colors: ['#e0e0e0', '#8d6e63'],
    draw(ctx, t) {
      emoji(ctx, '🐒', 120 + ((t * 25) % 400), 180, 100);
      emoji(ctx, '🐌', 120 + ((t * 30) % 400), 260, 40);
      emoji(ctx, '💤', 500, 100, 50, Math.sin(t) * 0.3);
    },
  },
  {
    title: 'Elephants Hear With Their Feet',
    caption: 'Elephants can feel rumbles from other elephants through the ground - with their feet!',
    colors: ['#fff3e0', '#a1887f'],
    draw(ctx, t) {
      emoji(ctx, '🐘', 180, 180, 120);
      emoji(ctx, '🐘', 470, 180, 100);
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.8 + i / 3) % 1);
        emoji(ctx, '〰️', 230 + k * 190, 250, 40, 0, 1 - k);
      }
      emoji(ctx, '🦶', 320, 110, 45, Math.sin(t * 3) * 0.3);
    },
  },
  {
    title: 'Gorilla Bedtime',
    caption: 'Mountain gorillas build a brand-new bed out of leaves and branches every single night!',
    colors: ['#c5e1a5', '#33691e'],
    draw(ctx, t) {
      emoji(ctx, '🦍', 300, 160, 130, Math.sin(t * 1.5) * 0.05);
      emoji(ctx, '🍃', 230, 250, 50, t);
      emoji(ctx, '🍃', 370, 250, 50, -t);
      emoji(ctx, '🛏️', 480, 230, 60);
      emoji(ctx, '🌙', 520, 90, 50);
    },
  },
  {
    title: 'Spotty Fingerprints',
    caption: 'Every whale shark has its own pattern of spots - just like your fingerprints are only yours!',
    colors: ['#b3e5fc', '#01579b'],
    draw(ctx, t) {
      emoji(ctx, '🦈', 300 + Math.sin(t) * 60, 190, 140);
      emoji(ctx, '👆', 500, 120, 60);
      for (let i = 0; i < 6; i++) emoji(ctx, '⚪', 120 + i * 80, 80 + Math.sin(t * 2 + i) * 10, 18);
    },
  },
  {
    title: 'Stripes All the Way Down',
    caption: "A tiger's skin is striped too - not just its fur! No two tigers have the same stripes.",
    colors: ['#ffe0b2', '#e65100'],
    draw(ctx, t) {
      emoji(ctx, '🐅', 300, 180 + bounce(t, 4, 12), 150);
      emoji(ctx, '🦓', 500, 120, 50, Math.sin(t * 2) * 0.2, 0.7);
      emoji(ctx, '✨', 150, 110, 40, t);
    },
  },
  {
    title: 'Puffin Party Beak',
    caption: "A puffin's beak turns bright orange in summer - then the colourful outside falls off in winter!",
    colors: ['#e1f5fe', '#37474f'],
    draw(ctx, t) {
      const summer = Math.sin(t * 1.2) > 0;
      emoji(ctx, '🐦', 300, 180 + bounce(t, 5, 10), 130);
      emoji(ctx, summer ? '☀️' : '❄️', 480, 110, 60, t * 0.5);
      emoji(ctx, '🥕', 380, 175, 40, -1.2, summer ? 1 : 0.2);
    },
  },
  {
    title: 'Save Water, Save Animals',
    caption: 'Turn off the tap while you brush your teeth - it saves lots of water for people AND animals!',
    colors: ['#e3f2fd', '#1976d2'],
    draw(ctx, t) {
      emoji(ctx, '🪥', 200, 170, 90, Math.sin(t * 10) * 0.2);
      emoji(ctx, '🚰', 360, 140, 80);
      const d = (t * 1.5) % 1;
      emoji(ctx, '💧', 360, 190 + d * 60, 30, 0, Math.sin(t) > 0 ? 1 - d : 0);
      emoji(ctx, '🐸', 500, 230 + bounce(t, 4, 15), 60);
    },
  },
  {
    title: 'Walrus Tooth Walking',
    caption: 'Walruses use their long tusks to pull their heavy bodies out of the water - like ice axes!',
    colors: ['#e1f5fe', '#4fc3f7'],
    draw(ctx, t) {
      const up = (Math.sin(t * 1.5) + 1) / 2;
      emoji(ctx, '🧊', 380, 230, 120);
      emoji(ctx, '🦭', 250 + up * 80, 260 - up * 70, 110, -0.3 + up * 0.3);
      emoji(ctx, '⛏️', 520, 120, 55, Math.sin(t * 3) * 0.4);
    },
  },
  {
    title: 'Penguin Huddle',
    caption: 'Emperor penguins huddle together and take turns standing in the warm middle. Teamwork!',
    colors: ['#eceff1', '#78909c'],
    draw(ctx, t) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t * 0.4;
        emoji(ctx, '🐧', 320 + Math.cos(a) * 110, 190 + Math.sin(a) * 35, 70 + Math.sin(a) * 10);
      }
      emoji(ctx, '🐧', 320, 185, 85);
      for (let i = 0; i < 6; i++) emoji(ctx, '❄️', ((i * 110 + t * 70) % W), ((i * 60 + t * 90) % H), 25, t);
    },
  },
  {
    title: 'Sea Turtle GPS',
    caption: "Sea turtles use Earth's magnetic field like a GPS to swim back to the beach where they hatched!",
    colors: ['#b2ebf2', '#00838f'],
    draw(ctx, t) {
      emoji(ctx, '🌍', 140, 150, 90, t * 0.3);
      emoji(ctx, '🐢', 320 + Math.sin(t) * 60, 220, 90);
      emoji(ctx, '🧭', 500, 130, 60, Math.sin(t * 4) * 0.5);
      emoji(ctx, '🏖️', 520, 260, 55);
    },
  },
  {
    title: 'Gorilla Chest Drum',
    caption: 'Gorillas beat their chests to talk to each other - the sound can travel up to 1 km!',
    colors: ['#c5e1a5', '#558b2f'],
    draw(ctx, t) {
      emoji(ctx, '🦍', 300, 180, 140, Math.sin(t * 12) * 0.05);
      const k = (t * 1.5) % 1;
      emoji(ctx, '🥁', 440, 170, 60, Math.sin(t * 12) * 0.2);
      emoji(ctx, '🔊', 500 + k * 60, 110, 40, 0, 1 - k);
    },
  },
  {
    title: 'Tiger Swim Club',
    caption: 'Unlike most cats, tigers LOVE water. They are great swimmers and cool off in rivers.',
    colors: ['#bbdefb', '#1e88e5'],
    draw(ctx, t) {
      emoji(ctx, '🐅', 320 + Math.sin(t * 1.2) * 80, 190 + Math.sin(t * 3) * 6, 120);
      for (let i = 0; i < 5; i++) emoji(ctx, '🌊', 80 + i * 120, 260, 55, Math.sin(t * 2 + i) * 0.1);
      emoji(ctx, '😎', 520, 110, 50);
    },
  },
  {
    title: 'Snow Leopard Long Jump',
    caption: 'Snow leopards can leap up to 9 metres - that is longer than a school bus!',
    colors: ['#f5f5f5', '#90a4ae'],
    draw(ctx, t) {
      const k = (t * 0.45) % 1;
      emoji(ctx, '🏔️', 110, 230, 110);
      emoji(ctx, '🏔️', 530, 230, 110);
      emoji(ctx, '🐆', 130 + k * 400, 160 - Math.sin(k * Math.PI) * 120, 80, k - 0.5);
      emoji(ctx, '🚌', 320, 300, 45, 0, 0.6);
    },
  },
  {
    title: 'Orangutan Umbrella',
    caption: 'When it rains, orangutans hold big leaves over their heads like umbrellas. Smart!',
    colors: ['#a5d6a7', '#2e7d32'],
    draw(ctx, t) {
      for (let i = 0; i < 10; i++) emoji(ctx, '💧', ((i * 67) % W), ((i * 40 + t * 160) % H), 25);
      emoji(ctx, '🦧', 320, 200, 130);
      emoji(ctx, '🍃', 320, 100 + Math.sin(t * 2) * 5, 110, 0.3);
    },
  },
  {
    title: 'Pangolin Ball',
    caption: "When a pangolin is scared it rolls into a tight ball of scales. Even lions can't open it!",
    colors: ['#ffe0b2', '#e65100'],
    draw(ctx, t) {
      const rolled = Math.sin(t * 1.2) > 0;
      emoji(ctx, rolled ? '🟤' : '🦔', 260 + (rolled ? (t * 80) % 160 : 0), 210, 100, rolled ? t * 4 : 0);
      emoji(ctx, '🦁', 500, 200, 90, Math.sin(t * 3) * 0.1);
      emoji(ctx, rolled ? '😵' : '😋', 500, 110, 40);
    },
  },
  {
    title: 'Beluga Faces',
    caption: 'Belugas can change the shape of their round forehead (the "melon") to make funny faces and sounds!',
    colors: ['#e3f2fd', '#64b5f6'],
    draw(ctx, t) {
      emoji(ctx, '🐳', 300, 200, 140, Math.sin(t * 2) * 0.1);
      emoji(ctx, ['😄', '😮', '😜', '😗'][Math.floor(t * 1.5) % 4], 450, 120, 60);
      emoji(ctx, '🎵', 520 + Math.sin(t * 3) * 20, 200, 40);
    },
  },
  {
    title: 'Puffin Fish Collector',
    caption: 'A puffin can carry more than 10 small fish in its beak at once, without dropping any!',
    colors: ['#e1f5fe', '#455a64'],
    draw(ctx, t) {
      emoji(ctx, '🐦', 260, 190, 120);
      const count = Math.min(10, Math.floor(t * 2));
      for (let i = 0; i < count; i++) emoji(ctx, '🐟', 370 + (i % 5) * 35, 170 + Math.floor(i / 5) * 35, 32, 0.3);
      bigText(ctx, `${count} 🐟`, 520, 90, '#e65100');
    },
  },
  {
    title: 'Elephants Never Forget',
    caption: 'Elephants have amazing memories - they remember friends and water holes for many years!',
    colors: ['#d7ccc8', '#6d4c41'],
    draw(ctx, t) {
      emoji(ctx, '🐘', 230, 190, 140);
      emoji(ctx, '🧠', 400, 110, 60, Math.sin(t * 2) * 0.2);
      emoji(ctx, '💧', 480, 230, 50 + Math.sin(t * 3) * 6);
      emoji(ctx, '🐘', 540, 200, 70);
    },
  },
  {
    title: 'Coral Reef City',
    caption: 'Coral reefs are like busy underwater cities - home to about a quarter of all sea creatures!',
    colors: ['#80deea', '#00838f'],
    draw(ctx, t) {
      ['🪸', '🐠', '🐙', '🦀', '🐡', '🐚'].forEach((e, i) => emoji(ctx, e, 90 + i * 95, 200 + Math.sin(t * 2 + i) * 25, 60, Math.sin(t + i) * 0.2));
      emoji(ctx, '🏙️', 540, 100, 50, 0, 0.7);
    },
  },
  {
    title: 'Recycle Your Old Phone',
    caption: 'Old phones contain metals that are mined from mountains. Recycling them means less mining!',
    colors: ['#e8f5e9', '#43a047'],
    draw(ctx, t) {
      emoji(ctx, '📱', 160, 180, 90, Math.sin(t * 2) * 0.2);
      emoji(ctx, '♻️', 320, 180, 90, t);
      emoji(ctx, '⛰️', 480, 180, 100);
      emoji(ctx, '😊', 480, 100, 45);
    },
  },
  {
    title: 'Owl Silent Flight',
    caption: 'Owls have soft, fringed feathers so they can fly almost completely silently!',
    colors: ['#263238', '#000000'],
    draw(ctx, t) {
      emoji(ctx, '🌙', 520, 80, 60);
      emoji(ctx, '🦉', 120 + ((t * 70) % 420), 170 + Math.sin(t * 3) * 25, 90);
      emoji(ctx, '🤫', 160, 90, 45);
      emoji(ctx, '🐭', 470, 280, 35);
    },
  },
  {
    title: 'Plant a Tree Day',
    caption: 'One big tree can make enough oxygen for up to 4 people each year. Plant one!',
    colors: ['#c8e6c9', '#388e3c'],
    draw(ctx, t) {
      const grow = Math.min(1, (t % 6) / 4);
      emoji(ctx, '🌱', 320, 240, 50, 0, 1 - grow);
      emoji(ctx, '🌳', 320, 240 - grow * 70, 40 + grow * 130, 0, grow);
      for (let i = 0; i < 4; i++) emoji(ctx, '🧑', 120 + i * 130 - (i > 1 ? -60 : 60), 280, 40);
    },
  },

  // ---- 小朋友 2026-10-17：多啲搞笑片 + 遊戲貼士（全部有 AI 聲讀）----
  {
    title: 'Dancing Panda',
    caption: 'This panda has the BEST dance moves! Pandas love to roll and tumble when they play.',
    colors: ['#f8bbd0', '#ce93d8'],
    pitch: 1.6, rate: 1.1,
    draw(ctx, t) {
      emoji(ctx, '🐼', 320, 185 + bounce(t, 7, 30), 130, Math.sin(t * 7) * 0.4);
      for (let i = 0; i < 5; i++) emoji(ctx, ['🎵', '🎶', '✨'][i % 3], 80 + i * 120, 90 + Math.sin(t * 4 + i) * 20, 40);
      emoji(ctx, '🪩', 520, 110, 60, t * 2);
    },
  },
  {
    title: 'Why Did the Turtle Cross the Road?',
    caption: 'To get to the SHELL station! Haha! Real sea turtles travel thousands of km across the ocean.',
    colors: ['#b2ebf2', '#26c6da'],
    pitch: 1.3, rate: 1.0,
    draw(ctx, t) {
      emoji(ctx, '🐢', 100 + ((t * 40) % 460), 200, 90);
      emoji(ctx, '⛽', 560, 180, 80);
      if (t % 4 > 2) bigText(ctx, 'HAHA!', 320, 110, '#00838f');
    },
  },
  {
    title: 'Sneezing Elephant',
    caption: 'Ahh... ahh... ACHOO! An elephant sneeze is SUPER loud. Bless you, elephant!',
    colors: ['#e0e0e0', '#9e9e9e'],
    pitch: 0.9, rate: 1.05,
    draw(ctx, t) {
      const k = t % 4;
      emoji(ctx, '🐘', 250, 190, 150, k > 3 ? -0.3 : Math.sin(k * 2) * 0.05);
      if (k > 3) {
        for (let i = 0; i < 6; i++) emoji(ctx, '💨', 420 + i * 30, 160 + Math.sin(i) * 30, 50);
        bigText(ctx, 'ACHOO!', 470, 100, '#e53935');
      }
    },
  },
  {
    title: 'Penguin Belly Slide',
    caption: 'Wheee! Penguins slide on their tummies because it is faster than walking. Toboggan time!',
    colors: ['#e3f2fd', '#64b5f6'],
    pitch: 1.5, rate: 1.15,
    draw(ctx, t) {
      emoji(ctx, '🐧', 60 + ((t * 90) % 560), 230, 80, Math.PI / 2.4);
      emoji(ctx, '❄️', 520, 100, 40, t);
      emoji(ctx, '❄️', 140, 80, 30, -t);
    },
  },
  {
    title: 'Sloth Speed Race',
    caption: 'Ready, set... go! ... Still going... Sloths and slow lorises are both VERY slow movers!',
    colors: ['#dcedc8', '#8bc34a'],
    pitch: 0.7, rate: 0.75,
    draw(ctx, t) {
      emoji(ctx, '🏁', 560, 180, 70);
      emoji(ctx, '🦥', 90 + t * 6, 200, 90);
      bigText(ctx, `${(t * 0.3).toFixed(1)} km/h`, 320, 110, '#33691e');
    },
  },
  {
    title: 'Owl Joke Time',
    caption: 'What do you call an owl magician? HOO-dini! Owls can turn their heads almost all the way round.',
    colors: ['#d7ccc8', '#8d6e63'],
    pitch: 1.2, rate: 1.0,
    draw(ctx, t) {
      emoji(ctx, '🦉', 300, 190, 130, Math.sin(t * 2) * 1.2);
      emoji(ctx, '🎩', 300, 95, 60);
      emoji(ctx, '🪄', 430, 200, 60, Math.sin(t * 5) * 0.5);
    },
  },
  {
    title: 'TIP: Train to Escape Bosses',
    caption: 'Game tip! Run on the Treadmill to get more Speed, and study at the Student Table for IQ. Then the Bosses cannot catch you!',
    colors: ['#fff59d', '#ffb300'],
    pitch: 1.1, rate: 1.05, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🏃', 200 + Math.sin(t * 6) * 10, 200, 100);
      emoji(ctx, '😡', 470, 200, 90, Math.sin(t * 10) * 0.1);
      bigText(ctx, '⚡ SPEED UP!', 330, 100, '#e65100');
    },
  },
  {
    title: 'TIP: Bosses Only Chase Borrowers',
    caption: 'Game tip! A Boss only chases you when you borrow an animal from his biome. Grab it and RUN back to the Hub!',
    colors: ['#ffccbc', '#ff7043'],
    pitch: 1.0, rate: 1.05, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🐼', 180, 190, 80);
      emoji(ctx, '🏃', 280 + ((t * 30) % 120), 200, 80);
      emoji(ctx, '🪓', 480, 200, 70, Math.sin(t * 8) * 0.4);
      emoji(ctx, '🏠', 580, 180, 60);
    },
  },
  {
    title: 'TIP: Plot = Money',
    caption: 'Game tip! Put your pets on your Plot. Every pet there earns money every second. Heavier and rarer pets earn more!',
    colors: ['#c8e6c9', '#43a047'],
    pitch: 1.1, rate: 1.0, tip: true,
    draw(ctx, t) {
      for (let i = 0; i < 4; i++) emoji(ctx, ['🐼', '🦏', '🐘', '🦊'][i], 140 + i * 110, 210 + bounce(t + i, 4, 10), 70);
      for (let i = 0; i < 6; i++) emoji(ctx, '💰', 100 + i * 90, 80 + ((t * 60 + i * 30) % 80), 36);
    },
  },
  {
    title: 'TIP: Night Is Breeding Time',
    caption: "Game tip! At night the Reproduce Machines work 10 times faster. On the Dragon's Lair you can answer a question to speed it up!",
    colors: ['#311b92', '#1a237e'],
    pitch: 0.95, rate: 1.0, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🌙', 110, 100, 70, Math.sin(t) * 0.2);
      emoji(ctx, '💗', 320, 200, 90 + Math.sin(t * 6) * 8);
      bigText(ctx, '10x', 480, 200, '#ff4081');
      for (let i = 0; i < 5; i++) emoji(ctx, '⭐', 60 + i * 130, 60 + (i % 2) * 30, 24);
    },
  },
  {
    title: 'TIP: Fuse Machine Magic',
    caption: 'Game tip! The Fuse Machine mixes 3 pets into one brand-new pet. Put in rare pets for a better chance of a Mythic!',
    colors: ['#b39ddb', '#5e35b1'],
    pitch: 1.2, rate: 1.0, tip: true,
    draw(ctx, t) {
      ['🐼', '🦊', '🐢'].forEach((e, i) => emoji(ctx, e, 130 + i * 90, 200 - Math.max(0, Math.sin(t * 2 - i)) * 40, 60));
      emoji(ctx, '🧪', 430, 200, 80, Math.sin(t * 4) * 0.2);
      emoji(ctx, '✨', 540, 150 + bounce(t, 5, 20), 60);
    },
  },
  {
    title: 'TIP: Hidden Secrets',
    caption: 'Game tip! Some secrets hide in sneaky places... have you looked UNDER things? Something red might be waiting!',
    colors: ['#424242', '#212121'],
    pitch: 0.8, rate: 0.9, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🔍', 220 + Math.sin(t * 2) * 80, 190, 100, Math.sin(t) * 0.3);
      emoji(ctx, '❓', 450, 150 + bounce(t, 3, 15), 70);
      emoji(ctx, '🌉', 450, 250, 70);
    },
  },
  {
    title: 'TIP: Jump Over Obstacles',
    caption: 'Game tip! Press Space to jump over rolling logs, trash and other obstacles. If they hit you, you get a question!',
    colors: ['#a5d6a7', '#2e7d32'],
    pitch: 1.3, rate: 1.1, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🪵', 120 + ((t * 120) % 500), 250, 60, t * 4);
      emoji(ctx, '🦘', 320, 210 - Math.abs(Math.sin(t * 3)) * 90, 90);
    },
  },
  {
    title: 'TIP: Eternal Is the Rarest',
    caption: 'Game tip! Rarities go Common, Rare, Epic, Legendary, Mythic... and ETERNAL! Follow the coloured light beams to find special pets.',
    colors: ['#18ffff', '#00838f'],
    pitch: 1.4, rate: 1.0, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🐋', 320, 190 + Math.sin(t * 2) * 15, 140);
      emoji(ctx, '👑', 320, 95 + Math.sin(t * 2) * 15, 60);
      for (let i = 0; i < 8; i++) emoji(ctx, '✨', 320 + Math.cos(t + i) * 200, 190 + Math.sin(t + i) * 90, 26);
    },
  },
  {
    title: 'TIP: Clean the Beach',
    caption: 'Game tip! In Biome 2, walk to trash on the beach and press E to clean it up. You get money AND help the sea animals!',
    colors: ['#fff3e0', '#ffcc80'],
    pitch: 1.2, rate: 1.05, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🏖️', 140, 200, 100);
      const k = Math.floor(t / 1.5) % 3;
      ['🥤', '🛍️', '🧴'].forEach((e, i) => i >= k && emoji(ctx, e, 330 + i * 70, 230, 50));
      emoji(ctx, '♻️', 520, 120, 70, t);
    },
  },
  {
    title: "TIP: Sell What You Don't Need",
    caption: 'Game tip! Visit the Sell Stall at the front of the Hub to sell extra pets for cash. Then buy upgrades!',
    colors: ['#dcedc8', '#7cb342'],
    pitch: 1.1, rate: 1.05, tip: true,
    draw(ctx, t) {
      emoji(ctx, '🏪', 200, 200, 110);
      emoji(ctx, '💵', 380 + Math.sin(t * 3) * 20, 170, 60);
      emoji(ctx, '⬆️', 520, 170 + bounce(t, 4, 15), 60);
    },
  },
];

function bigText(ctx, text, x, y, color) {
  ctx.font = '900 44px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// 自動換行
function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  lines.push(line);
  return lines;
}

const VIDEO_LENGTH = 12; // 每條片幾多秒，播完自動去下一條

// ================= AI 聲讀片（小朋友 2026-10-17）=================
// 用瀏覽器嘅 Web Speech（speechSynthesis）；冇就唔讀；靜音就唔讀
const speech = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
let voice = null;
function pickVoice() {
  if (!speech) return null;
  const voices = speech.getVoices() || [];
  // 小朋友：把聲好難聽 → 揀最自然嘅聲：Edge 嘅 Natural／Online 聲 > Google > Mac 嘅 Samantha > 其他英文聲
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const prefer = [/Natural|Neural/i, /Online/i, /Google US English/i, /Google UK English Female/i, /Google/i, /Samantha|Ava|Allison|Serena/i, /Aria|Jenny|Guy|Libby|Sonia/i];
  for (const re of prefer) {
    const v = en.find((x) => re.test(x.name));
    if (v) return v;
  }
  return en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
}
if (speech) {
  voice = pickVoice();
  try {
    speech.addEventListener?.('voiceschanged', () => (voice = pickVoice()));
  } catch {
    // 舊瀏覽器
  }
}
export function stopNarration() {
  try {
    speech?.cancel();
  } catch {
    // 唔得就算
  }
}
function narrate(video, index, muted) {
  stopNarration();
  if (!speech || muted) return;
  try {
    const u = new SpeechSynthesisUtterance(`${video.title}. ${video.caption}`);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-US';
    u.pitch = Math.min(1.1, Math.max(0.9, video.pitch ?? 1)); // 以前有啲片 1.6／0.7，聽落好怪 → 限喺 0.9–1.1
    u.rate = Math.min(1.05, Math.max(0.9, video.rate ?? 0.95));
    speech.speak(u);
  } catch {
    // 唔讀得就算
  }
}

function drawVideo(ctx, video, t, index) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, video.colors[0]);
  g.addColorStop(1, video.colors[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  video.draw(ctx, t);

  // 頂部標題
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, 44);
  ctx.font = '900 26px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillStyle = video.tip ? '#ffeb3b' : '#fff'; // 貼士片：黃色標題
  ctx.fillText(`${video.tip ? '💡' : '▶'} ${video.title}`, 14, 23);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.font = '700 18px sans-serif';
  ctx.fillText(`${index + 1}/${VIDEOS.length}`, W - 14, 23);

  // 右邊：好似短片 app 嘅掣
  emoji(ctx, '❤️', W - 36, 100, 30);
  ctx.font = '700 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${(index * 7 + 12) % 90 + 10}K`, W - 36, 126);
  emoji(ctx, '💬', W - 36, 160, 28);
  emoji(ctx, '🐾', W - 36, 205, 28);

  // 底部字幕
  ctx.font = '700 19px "Trebuchet MS", sans-serif';
  const lines = wrap(ctx, video.caption, W - 100);
  const boxH = lines.length * 24 + 16;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, H - boxH - 8, W, boxH + 8);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, 14, H - boxH + 8 + i * 24));
  // 進度條
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = '#ff4081';
  ctx.fillRect(0, H - 6, (W * (t % VIDEO_LENGTH)) / VIDEO_LENGTH, 6);
}

// 一個播片屏幕（3D 平面）
export function createVideoScreen(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));

  const screen = { mesh, index: 0, t: 0, slide: 0, prev: 0, slideDir: 1, redraw: 0, watching: false, spoken: -1, muted: false };

  // 玩家企喺跑步機睇緊片：開始／停止讀片（main.js 每格叫）
  screen.setWatching = (on, muted = false) => {
    if (muted && !screen.muted) stopNarration(); // 睇緊片撳咗靜音：即刻收聲
    screen.muted = muted;
    if (on === screen.watching) return;
    screen.watching = on;
    if (on) narrate(VIDEOS[screen.index], screen.index, muted);
    else stopNarration();
    screen.spoken = on ? screen.index : -1;
  };

  screen.next = (dir) => {
    if (screen.slide > 0) return false; // 碌緊就等等
    screen.prev = screen.index;
    screen.index = (screen.index + dir + VIDEOS.length) % VIDEOS.length;
    screen.slide = 1;
    screen.slideDir = dir;
    screen.t = 0;
    return true;
  };

  // nearby：玩家喺附近先畫（慳電）
  screen.update = (dt, nearby) => {
    screen.t += dt;
    // 讀緊嘅片：等把聲讀完先自動去下一條
    const talking = screen.watching && !!speech?.speaking;
    if (screen.t > VIDEO_LENGTH && screen.slide === 0 && !talking) screen.next(1);
    if (screen.watching && screen.spoken !== screen.index && screen.slide === 0) {
      screen.spoken = screen.index;
      narrate(VIDEOS[screen.index], screen.index, screen.muted);
    }
    if (!nearby) return;
    screen.redraw -= dt;
    if (screen.redraw > 0 && screen.slide === 0) return;
    screen.redraw = 1 / 24; // 每秒畫 24 格
    if (screen.slide > 0) {
      // 碌片動畫：舊片向上推走，新片由下面上嚟
      screen.slide = Math.max(0, screen.slide - dt * 3.5);
      const offset = (1 - screen.slide) * H * screen.slideDir;
      ctx.save();
      ctx.translate(0, -offset);
      drawVideo(ctx, VIDEOS[screen.prev], 0, screen.prev);
      ctx.translate(0, H * screen.slideDir);
      drawVideo(ctx, VIDEOS[screen.index], 0, screen.index);
      ctx.restore();
    } else {
      drawVideo(ctx, VIDEOS[screen.index], screen.t, screen.index);
    }
    // 提示可以碌
    ctx.font = '700 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('🖱️ Scroll for next video', W / 2, 62);
    if (screen.watching) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(14, 52, 150, 26);
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'left';
      ctx.fillText(speech && !screen.muted ? '🔊 AI voice' : '🔇 AI voice (muted)', 22, 66);
    }
    texture.needsUpdate = true;
  };
  screen.update(0, true);
  return screen;
}
