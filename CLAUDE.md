# 瀕危動物救援遊戲（Animal Rescue Game）

家長（廣東話）同小朋友一齊開發嘅 3D 教育遊戲。設計原稿：`docs/design-prompt.md`（小朋友嘅設計，唔好改原稿；改動另開新版本）。

## 同用戶合作
- 回覆語言：2026-10-11 小朋友要求用英文回覆（簡單英文）；家長要求先轉返廣東話。之前：用廣東話回覆；遊戲內文字預設英文（原稿係英文），除非用戶另外要求。
- 呢個係小朋友嘅項目：解釋要淺白、一步一步，每步做完可以即刻玩到／睇到先做下一步。
- 設計決定（玩法、數值、美術）屬於小朋友，拎唔定就問；技術做法（引擎、檔案結構、寫法）由我建議兼解釋原因。
- 主題係「借／救援」唔係偷：文字、名稱、動畫都要配合保育同適齡。

## 狀態
- 2026-10-10：開目錄，只有設計原稿。
- 2026-10-10：揀咗**網頁 Three.js**（Vite + 普通 JavaScript），單人，localStorage 存檔。開發計劃見 `docs/plan.md`，

- 2026-10-10：第 1 步完成（⊥ 地圖、圍牆、WASD 行路）。
- 2026-10-10：第 2 步完成 + 小朋友要求：第一身視角（滑鼠轉頭）、地圖縮細、生態區裝飾、夜晚倒數、My Stats 面板（P 掣）。Speed/IQ/錢已經存落 localStorage。
- 2026-10-10：第 3 步完成：Biome 1 隨機出 1 隻動物（熊貓／兩種象／黑犀牛有 3D 模型），E 借，抱返 Hub = 救援（rescued+1、入圖鑑、放入 `state.borrowed` 等繁殖機）+ 知識卡。30 隻動物資料喺 `src/data/animals.js`（status 係 IUCN 實況，有啲唔係瀕危，照實寫）。
- 2026-10-10：小朋友一次過要晒：做咗第 4–8、10 步 + 快捷欄 + 地圖放大（Hub 80×36、生態區 24×50）。5 個 Boss（會追）、障礙物 + 問答（停住遊戲）、學生桌、升級牌（越升越型）、5 部繁殖機、有圍欄地塊、圖鑑（I 掣）、30 隻動物 3D 模型。決定同數值見 `docs/plan.md`。
- 2026-10-10：小朋友試玩後改：Hub 縮細（60×26）、Blocky（Roblox）美術風格（動物／Boss／樹全部重做，有走路動畫）、牌重畫（`src/signs.js`）、Boss 要求牌、Boss 只追抱住佢動物嘅人、問答頭 0.8 秒唔收掣（防止逃走時亂撳跳過咗題目）、頭頂顯示 $/s、題目加到 92 條（有填充題）、天空漸變 + 柔和影。下一步：第 9 步稀有度、第 11 步教學關，或者小朋友試玩後嘅修改。

- 2026-10-11：又一大輪（全部決定記喺 `docs/plan.md`「小朋友已經決定咗」）：重量 kg 影響收入、稀有度、夜晚落閘、Biome 6 Mining Mountain、每區 +2 隻（共 50 隻）、地塊位 8→18、Equip Best／Unequip／Sell、開場動畫、聲效、跑步機短片、升級外觀 Heavenly／Luminous／Mountain Magical（Lv14 MAX）。效能：唔郁嘅裝飾用 `bakeStatic`（`src/world.js`）焊埋，裝飾可以行穿。
- 小朋友會喺我做緊嘢時不斷加新要求、改主意（例如地圖大細、水池）；每次照做，記低喺 plan.md。
- 2026-10-11：加跳（空白鍵 + 地心吸力，`src/player.js`）同石台系統（`platforms`／`groundAt`，`src/world.js`）；Biome 6 改做大三角形山，動物喺山頂；障礙物可以沿 z 郁同跟住山嘅高度。
- 2026-10-11：背景音樂 + 聲效加大（`src/sound.js`）、Bloom 發光（`main.js` 用 EffectComposer）、Index 加跑步機／學生桌分頁、頭 20 隻動物重做（`src/animals20.js` + `src/modelKit.js`，優先過 `animalModels.js` 嘅舊款）。
- 2026-10-11 13:19：臨時部署去 NAS（Unraid nas.home）俾小朋友玩：http://nas.home:8097 （192.168.71.18:8097）。busybox 容器 `animal-rescue-temp`（--rm），72 小時後（約 2026-10-14 13:19）自動停機兼刪 `/mnt/user/appdata/animal-rescue-temp/www`。NAS 重開機會提早消失。更新：`npx vite build` 再 rsync `dist/` 去嗰個 www。
- 2026-10-11：自動畫質（G 掣手動）、Boss 追出生態區直到 Hub、跑步機／學生桌 14 級每級一款（`TIERS` 喺 `src/hub.js`），升級加貴。
- 2026-10-11：鏡頭改用自己寫嘅 `MouseLook`（`src/player.js`，過濾 Chrome pointer-lock 嘅假大跳）、跑步機／學生桌 15 級、地塊皮膚（`PLOT_SKINS`）、Boss 光環。
- 2026-10-11：繁殖機 3 級升級（`MACHINE_LEVELS`，`state.machineLevel`；記錄存 `total`）、夜晚 10 倍速（`hub.night`）、Astral 特效重做。
- 2026-10-11：Lv14/15 同繁殖機 Mountain Magic 加強、其他升級 +10%；其餘 30 隻動物重做（`src/animals30.js`，用 `animals20.js` export 嘅 beast/swimmer/bird）；Index 加 Machines 分頁；Frozen/Molten/Sci-Fi/Celebrity 加特效。
- 2026-10-11：教學關（`src/tutorial.js`，`state.tutorialStep/tutorialDone`）、寵物大細跟重量（`kgScale` 喺 `src/data/animals.js`）、地塊唔再縮細大動物。
- 2026-10-11：日夜跟真實時鐘（`dayNight.offset` 測試用）、隨機活動（`src/events.js`，`boost` 俾 hub/animals 讀；console `game.forceEvent('giant'|'rare'|'frenzy'|'training')`）。
- 2026-10-11：繁殖機 Lv4 La Combination（機記錄有 `second`；寵物有 `sizeMul`；`collectPet` 回傳 list）。
- 2026-10-11：Biome 6 山後秘密拉桿（`LEVER` 喺 `src/biomes.js`，`state.leverReadyAt`）。
- 2026-10-11：野生動物用 seed 固定（`spawnAnimal(..., { seed, sizeMul })`、`dayCycle`），巨型 `sizeMul` 一路帶到寵物；Giant Pets 改 ×3；拉桿 1 秒冷卻。
- 2026-10-11：拉桿秘密活動 BIG PET FRENZY（`SECRET_EVENT`）、暫停凍結世界 + 繁殖機補返暫停時間（`pausedSince`）。
- 2026-10-11：第三身（`src/thirdPerson.js`：畫面用 `thirdPerson.view`，移動仍用 `camera`；手上模型用 `removeFromParent()`）、地塊巨型寵物上限 60 米。
- 2026-10-11：滑鼠轆 = 鏡頭 zoom（`zoomCamera`，存 `animal-rescue-zoom`），快捷欄只用 1–0；頭頂寵物真實大細（`realMax`）；跑步／坐低動畫。
- 2026-10-11：Shift Lock（`MouseLook.freeMode`）、每日任務 + Skin Tokens（`src/quests.js`）、皮膚商店（`src/skins.js`，`applyRangerSkin`/`applyPetSkin`）、Hub 擴建（`state.hubLevel`，`HUB.maxZ` 跟住變，買完 reload + sessionStorage 跳開場）。
- 2026-10-13：上咗 GitHub（**Public**，小朋友要求公開）：https://github.com/AfreakyDaPizza/animal-rescue-game ，repo 屬小朋友帳號，家長 `gavinc2025` 係 collaborator（呢部機 SSH key 用家長帳號 push）。
- 2026-10-14：GitHub Pages 自動部署（`.github/workflows/deploy.yml`，push 上 `main` 就更新）：https://afreakydapizza.github.io/animal-rescue-game/ 。`vite.config.js` 用 `base: './'`。
- 2026-10-15：小朋友用 GitHub Issue 提要求（教咗佢：Issues → New issue；`curl` GitHub API 讀，repo 係 public 唔使登入）。Issue #1：圓形大 Hub（`src/hubShape.js`／`src/hubPark.js`）、新開場動畫（`src/intro.js`，Owner 喺 `src/owner.js`）、取消 Expand Hub。其餘項目同小朋友答案記喺 `docs/plan.md`「GitHub Issue #1」。
- 2026-10-15（下晝）：Hub 分區 + Magic Library + Sell Stall（`src/hubBuildings.js`）、電影感開場、Boss 彈飛返 Hub、刪拉桿、山樓梯、Biome 2 沙灘（`TRASH` 執垃圾）+ Captain Oil Spill、生態區 42×62。每做完一部分就 push 上 main（自動部署）。

- 2026-10-15（夜）：Issue #2（BUG 02 + IDEA 01）：修咗吊床 Owner 反轉（`lieOnHammock` 改仰瞓，commit 72c0785，Refs #2）。Issue 留咗 checklist 同兩條問題（Arctic Smeltdown／Smugglers Compound 點 redesign；2.5 分鐘前變 dawn 係咪指黃昏）。未做：25 隻寵物開閘 → Laboratory → 四隻手 Mutated Scientist Poacher Boss（無人機、腐化動物、傳送門 Boss、紅框拍手、Solar Energy Capsule×4）→ 結局動畫＋黑幕字；閘外海灘睇流星＋秘密結局「THE COLLAB」。

## 點樣玩／開發
- **團隊流程（2026-10-15）**：小朋友喺 GitHub 開 Issue（範本喺 `.github/ISSUE_TEMPLATE/`，規則喺 `CONTRIBUTING.md`，英文）；我哋做完 commit 寫 `Fixes #編號` 再 push 上 main（自動部署）。有問題就喺 Issue 留言問小朋友（`gh`，裝咗喺 `~/.local/bin`）。小朋友會自己喺 GitHub 網頁改 `src/data/balance.js` 嘅數值，所以**開工前先 `git pull origin main`**。
- `npm run dev` → 瀏覽器開 http://localhost:5180（固定 5180，因為 5173 俾另一個項目用緊）。
- 地圖尺寸喺 `src/world.js` 頂部；-z 係「上」（生態區方向）。暫定數值一覽見 `docs/plan.md`。
- 開發模式 console 有 `window.game`（camera、dayNight、scene、state、hub、rescue、spawn(biome, rarity) 等）；試玩 script 可以 `#start.hidden = true` 跳過開始畫面（無頭瀏覽器鎖唔到滑鼠）。
- 試玩影相：用 Python playwright（已裝）開無畫面 Chromium，要加 `--use-angle=swiftshader` 先有 WebGL。

## 未決定
- 其他設計問題列咗喺 `docs/plan.md`「要小朋友決定嘅嘢」。
