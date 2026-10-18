# 🐼 Animal Rescue — Team Rules

Welcome to the team! You are the **game designer** 🎨. You decide what the game should be like.
Dad and Claude are the **builders** 🔨. They write the code and put the game online.

Here's how we work together.

---

## 1. 💡 Asking for a change (Issues)

1. Go to **https://github.com/AfreakyDaPizza/animal-rescue-game/issues**
2. Click the green **New issue** button.
3. Pick one:
   - **💡 New idea or change**: something new, or something you want to look or work differently.
   - **🐛 Bug**: something is broken.
4. Fill in every box. Then click **Create**.

### The golden rules

- ✅ **One idea = one Issue.** Have 5 ideas? Make 5 Issues. Each one gets ticked off when it's done, and things get done faster.
- ✅ **Say exactly where.** "The fountain in the Hub" is better than "the Hub".
- ✅ **Say how you'll know it's done.** "The panda statue is gold and spins" is better than "make it cool".
- ✅ **Add a picture** if you can. Press **Win + Shift + S**, then **Ctrl + V** in the box.
- ✅ **Check your Issues.** Claude might leave a comment with a question. Answer it in the comments!
- ✅ When your idea is in the game, the Issue gets **closed** ✔️. Wait about **1 minute**, then press **Ctrl + F5** on the game page to see it:
  **https://afreakydapizza.github.io/animal-rescue-game/**
- ❌ Don't change your mind in the same Issue. Made a mistake? Write a comment, or make a new Issue.

---

## 2. ⚠️ Stay safe online (VERY important)

This project is **public**. **Everyone in the world** can read Issues, comments and code.

- ❌ No real names (yours, your family's, your friends').
- ❌ No school name, home address, phone number, email or passwords.
- ❌ No photos or videos of yourself or your family.
- ❌ Don't say how old you are or where you live.
- ✅ Screenshots of the **game** are totally fine.
- ✅ If a stranger comments on your project, **don't reply**. Tell Dad.

---

## 3. 🔧 Tweak the game yourself (be a real coder!)

All the game numbers live in one file: **`src/data/balance.js`**.
You can change them right on the GitHub website. You don't need to install anything.

### How to change a number

1. Open **https://github.com/AfreakyDaPizza/animal-rescue-game/blob/main/src/data/balance.js**
2. Click the **✏️ pencil** (top right of the file).
3. Find the number and change it. **Only change the number!**
4. Click the green **Commit changes...** button.
5. Write a short message, like `Make the Lumberjack slower`, then click **Commit changes**.
6. Wait about 1 minute, then press **Ctrl + F5** on the game page. Your change is live! 🎉

### ⚠️ The coder rules

- Change **only numbers**. Keep every `,` `[ ]` `{ }` `'` exactly where it was.
- ✅ Good: `speed: 550,` → `speed: 400,`
- ❌ Bad: `speed: 550,` → `speed: 400` (the comma is missing, so the game breaks!)
- Change **one thing at a time**. Then you'll know which change did what.
- **Didn't see your change?** Go to the **Actions** tab. A **red ❌** means the robot found a mistake, and the old game is still online (so nothing is lost). Ask Dad or Claude to help you fix it.

### Numbers you can try

| What it is | What it looks like in the file | Try this |
|---|---|---|
| How much Speed / IQ you need to get past each boss | `{ name: 'Lumberjack', speed: 550, iq: 200 },` | Smaller = easier boss |
| Money per second for pets from each biome | `BIOME_BASE_MONEY = [1, 5, 25, 150, 1000, 6000]` | Bigger = richer, faster |
| How often each rarity shows up (%) | `{ name: 'Mythic', chance: 2, money: 15, ...` | The 5 `chance` numbers **must add up to 100** |
| How many times more money a rarity makes | `money: 15` (in the same line) | Bigger = that rarity earns more |
| Seconds a Reproduce Machine takes | `REPRODUCE_SECONDS = [30, 60, 120, 240, 480, 900]` | Smaller = pets come faster |
| How many obstacles are in each biome | `HAZARD_COUNT = [6, 7, 8, 9, 10, 11, 12]` | Bigger = harder |
| How fast the obstacles move | `HAZARD_SPEED = [4.2, 5.6, 7, 8.4, 10.5, 12.6, 14]` | Bigger = harder |
| How many pets fit on your Plot at the start | `PLOT_START_SLOTS = 8` | Bigger = more pets |
| Selling a pet gives you this many seconds of its money | `SELL_SECONDS = 60` | Bigger = sells for more |
| Money for cleaning up one piece of beach trash | `TRASH_REWARD = 20` | Bigger = more cash |
| Your hearts in the Boss Arena | `LAB_LIVES = 5` | Bigger = easier boss fight |
| Seconds the red box follows you before the hand slams | `LAB_SQUASH_FOLLOW = 3` | Smaller = harder |
| Legendary animals the portal wants (Route B) | `LAB_LEGENDARY_NEEDED = 3` | Smaller = portal opens easier |

💡 **Scientist tip:** before you change a number, guess what will happen. Then test it.
Were you right? That's how real game designers balance their games!

---

## 4. 🙌 Be a good teammate

- Say **thanks** when something gets done. Builders love that! 😄
- If something isn't how you wanted it, that's OK. Make a new Issue and explain what to change.
- Have fun! 🐾
