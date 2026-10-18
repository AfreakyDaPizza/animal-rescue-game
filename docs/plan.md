# 開發計劃（v1，2026-10-10）

根據 `docs/design-prompt.md`。原則：**每一步做完都可以即刻打開瀏覽器玩到／睇到**，先做下一步。

## 技術做法（已決定：網頁 Three.js）

| 項目 | 做法 | 點解 |
|---|---|---|
| 3D 引擎 | Three.js | 喺呢部機就寫得，瀏覽器打開即玩 |
| 開發工具 | Vite（`npm run dev`） | 改完 code 一儲存，瀏覽器自動更新，即刻見到效果 |
| 語言 | 普通 JavaScript（唔用 TypeScript） | 少啲規矩，小朋友都睇得明 |
| 美術 | 先用簡單方塊／圓柱（低多邊形） | 先做好玩法，之後先換靚模型 |
| 單人／多人 | 單人 | 多人要另外起伺服器，太複雜；之後真係想要先再諗 |
| 存檔 | 瀏覽器 localStorage | 唔使伺服器，關咗再開都記得進度 |

檔案結構（預計）：

```
index.html          ← 遊戲網頁
src/main.js         ← 開始遊戲、主迴圈
src/world.js        ← ⊥ 形地圖、圍牆
src/player.js       ← 公仔、移動、鏡頭
src/data/animals.js ← 30 隻動物資料（名、生態區、知識）
src/data/questions.js ← 野生動物問題
...（每一步加新檔案）
```

## 步驟

| # | 做乜 | 做完玩到乜 |
|---|---|---|
| 1 ✅ | ⊥ 形地圖 + 圍牆 + 可以行嘅公仔（WASD／方向鍵，鏡頭跟住） | 喺 Hub 同生態區通道行嚟行去，撞牆唔會跌出去 |
| 2 ✅ | 跑步機 + Speed 數值 + 畫面顯示（HUD）+ 第一身視角、夜晚倒數、My Stats 面板、生態區裝飾 | 企上跑步機 Speed 會升，行得越嚟越快 |
| 3 ✅ | 生態區 1（砍伐森林）+ 借動物 | 行入生態區 1，走近隨機動物按 E 借，帶返 Hub |
| 4 ✅ | 障礙物（垃圾、污染空氣）+ 問答 | 撞到障礙物彈出野生動物問題 |
| 5 ✅ | 5 部繁殖機 + 計時器 | 放動物入機，等倒數完就得到寵物 |
| 6 ✅ | 地塊（Plot）+ 每秒賺錢 + 跑步機升級 | 寵物放上地塊會賺錢，用錢升級跑步機 |
| 7 ✅ | 學生桌 + IQ | 練 IQ，問題變容易 |
| 8 ✅ | 動物圖鑑（Animal Index）+ 收集獎勵 | 睇到收集咗邊啲動物、知識、完成度 |
| 9 | 稀有度（Common → Mythic） | 借到嘅動物有唔同稀有度 |
| 10 ✅ | 生態區 2–5 + Boss + 每 5 分鐘夜晚重置 | 成條 ⊥ 地圖都玩得 |
| 11 ✅ | 教學關 + 快捷欄／背包 + 存檔 | 新玩家由教學開始，關咗再開記得進度 |
| 12 | 美術、聲音、打磨 | 遊戲變靚 |

## 數值（小朋友可以改）

所有遊戲數值（Boss 速度／IQ、寵物每秒賺幾多、繁殖時間、升級價錢、圖鑑獎勵、障礙物數量同速度）集中喺 **`src/data/balance.js`**。

其他：
| 數值 | 而家係 | 喺邊度改 |
|---|---|---|
| Speed → 行路速度 | 100 → 每秒 6 格；Speed 每加倍快 3 格（2,000,000 → 49 格）；Boss 都係用同一條公式 | `src/player.js` 嘅 `walkSpeed` |
| 夜晚有幾耐 | 20 秒（原稿冇講） | `src/daynight.js` 嘅 `NIGHT_LENGTH` |
| 地圖大細 | Hub 係圓形（半徑 38 米，2026-10-15），每個生態區 24 闊 × 50 長（小朋友改過幾次：太大 → BIGGER and LONGER → Hub 細返啲） | `src/world.js` 頂部 |
| 每個生態區每輪幾多隻動物 | 1 隻，入夜先換新（跟原稿） | `src/main.js` |
| 升級外觀 | Lv1 Basic → Lv3 Blue Steel → Lv5 Neon → Lv8 Golden → Lv12 Rainbow Legend | `src/hub.js` 嘅 `TIERS` |

## 小朋友已經決定咗（2026-10-10）

- 撞障礙物：遊戲停住，要答完問題先繼續；答錯 → 抱住嘅動物跑返生態區。
- Boss：**只有你借咗佢生態區嘅動物先追**（其他生態區 Boss 唔理你、行近都唔追）；你走出佢生態區佢都照追，追到 Hub 門口為止（Hub 安全）；捉到你 → 問難題，答啱 Boss 暈 3 秒，答錯冇咗隻動物。
- 美術風格：**Blocky（Roblox 款）**——動物、Boss、樹都係圓角方塊，有走路動畫。
- 每個生態區入口有 Boss 牌：要幾多 Speed／IQ、你夠唔夠、呢度寵物每秒賺幾多。
- 動物頭頂顯示名 + 每秒賺幾多錢；越遠生態區賺越多。
- 題目要有填充題（例如 Factories ____ waste ____ oceans）同「What does extinct mean?」。
- 題目：英文，9–11 歲程度。IQ 夠該生態區 Boss IQ → 刪走 1 個錯答案；夠 3 倍 → 刪 2 個。
- 快捷欄放救返嚟嘅動物同寵物，1–0／滑鼠轆揀。
- 每升級一次設施都要「變型啲」。

- 重量 = 錢：每秒賺 = 生態區底價（$1/$5/$25/$150/$1,000/$6,000）×（1 + √kg × 0.1）× 稀有度倍數。
- 稀有度（原稿機率）：Common 45%、Rare 25%、Epic 13%、Legendary 15%、Mythic 2%；Legendary／Mythic 出現會宣佈 + 彩色光柱 + 右上角方向箭咀。
- 地塊：海洋動物同雀喺地塊上面飛（小朋友話唔要水池）；Kakapo、企鵝唔識飛，喺地上行。
- 繁殖機升級（一次升晒 5 部）：Lv1 Basic → Lv2 Nature Growth（快 20%，$5,500）→ Lv3 Mountain Magic（加強後快 35%，$75,000）；
- 繁殖機 Lv4 **La Combination**（$1,000,000）：再快 30%（疊埋總共快 ~54%）、一次放 2 隻、每隻 20% 機會變 GIANT ×1.5–10（重量同收入跟住大）。
- 加強（Medium）：跑步機／學生桌 Lv14 ×1.5、Lv15 ×2；其他升級（Lv2–13、地塊、Nature Growth）貴 10%。
- 夜晚繁殖機 10 倍速。
- Frozen／Molten／Sci-Fi／Celebrity 加料：極光冰拱門霜霧；火山火球火焰黑煙；掃描光板無人機激光格電流；閃光燈彩紙金星燈牌迪士高波。
- Astral 重做：旋轉銀河、宇宙傳送門、星球軌道、流星、星雲、光柱、星空機身。
- 地塊皮膚：每升一級換一個（Grass Field → Flower Meadow → Sandy Beach → Bamboo Garden → Snowy Yard → Candy Land → Jungle → Lava Rock → Crystal Cave → Golden Palace → Rainbow Paradise）。
- Boss 型啲：發紅光眼、主題色光環、圍住轉嘅發光碎片；追你時光環變紅變大、Boss 大隻啲。
- 地塊位：8 隻起，可以升級 10 次，最多 18 隻；MY PETS 牌可以 Equip／Unequip／⭐ Equip Best／Sell（賣價 = 1 分鐘收入）。
- 夜晚：生態區入口落閘；喺入面嘅人送返 Hub，抱住嘅動物返去生態區。
- Boss Speed 要求 = 原稿 +10%；跑步機 Speed −10%；升級價錢平咗（10 × 1.9^(L−1)）。
- 升級外觀（2026-10-11 小朋友定）：每級一款，共 15 級：Basic → Starters → Iron Steel → Golden Steel → Neon → Frozen → Molten → Diamond → Sci-Fi → Hacker → Celebrity → Heavenly → Luminous → **Mountain Magic (14)** → **Astral (15, MAX)**。每部機有舞台底座 + 頭頂款式名。升級價錢 50 × 2.4^(L−1)（加貴咗）。
- Biome 6 **Mining Mountain**（Boss：Mega Digger，22,000,000 Speed），10 隻瀕危山區動物；每個原有生態區加 2 隻 → 共 50 隻。
- 開場動畫：動物玩 → Boss 用籠捉走 → 黑畫面「Save all the animals... to save the world.」（任何掣跳過）。
- 跑步機屏幕播 37 條又搞笑又真實嘅短片（題目共 165 條），企喺跑步機轆滑鼠碌片。
- 有聲效（M 開關）。
- 日夜跟真實時鐘：每個整 5 分鐘（4:00、4:05…）入夜 20 秒；計時牌顯示幾點入夜。
- 秘密拉桿：Biome 6 座山後面（經山兩邊窄路入去），撳 E 即刻開始一個隨機活動；1 秒冷卻（小朋友要求）；每次拉有 50% 機會出秘密活動 **BIG PET FRENZY**（野生動物 ×10000 大、重量 ×10000，30 秒；畫面上最大 60 米），其餘係普通隨機活動。
- 鏡頭：轆滑鼠拉近拉遠（0 = 第一身，最遠 20 米），快捷欄改用 1–0；第三身見到護林員公仔，拎住寵物會頂喺頭上（向前、真實大細：普通最大 8 米、巨型 25 米），跑步機上會跑步、學生桌會坐低寫字。
- 地塊巨型寵物畫面上限 60 米（普通寵物 7 米）。
- Shift Lock（似 Roblox）：Shift 切換鎖住／放開滑鼠；放開時見到滑鼠、右鍵拖轉鏡頭、遊戲唔暫停。
- Skin Tokens 🎟️：每日 3 個任務（Q 掣，`src/quests.js`）＋每隻新寵物（Common 1 … Mythic 10）。
- 皮膚商店攤位（Hub 右下）：護林員皮膚 7 款（Classic/Ninja/Panda/Astronaut/Knight/Golden/Rainbow）、寵物皮膚 6 款（Natural/Shadow/Golden/Neon/Galaxy/Rainbow，換晒所有寵物）。（以前有擴建 Hub：2026-10-15 取消，Hub 免費變大，買過嘅退返代幣。）
- 隱藏寵物（H 掣／頂部掣）：收埋地塊同手上嘅寵物，照樣賺錢；巨型寵物遮住 Hub 時用。
- 學生桌坐姿改正（之前手向後、沉落櫈）。
- 暫停：動物、動畫、繁殖機倒數全部停；日夜同活動時鐘跟真實時間照行（小朋友 2026-10-11 揀 A：保持跟真實時鐘）。
- F5 唔會換動物：每段 5 分鐘白天嘅動物係固定（seed），救咗嘅記喺 `state.takenSpawns`，refresh 都唔會再出。
- 隨機活動：每個真實整點／半點開始（同一時段大家都係同一個）：Giant Pets（野生動物 ×3 大（本來 ×10，太大），借返嚟入機出嚟都係巨型，每 30 秒換一批，5 分鐘）、Rare Rush（只出 Legendary／Mythic，30 秒）、Pet Frenzy（寵物錢 ×10，5 分鐘）、Training No Mercy（訓練 ×100，20 秒）。
- 背景音樂（即場合成）：Hub 開心、生態區冒險、俾 Boss 追會變緊張、夜晚柔和；聲效大聲咗。
- Index 有三個分頁：Animals／Treadmills／Student Tables，可以睇晒每個升級款式（未解鎖係灰色加鎖）。
- 「型啲」：發光效果（Bloom）、Fredoka 遊戲字款、HUD 有立體感。
- 教學關（10 步，新玩家自動開始，K 跳過）：行路 → 跑步機 → 學生桌 → 入 Biome 1 → 借動物 → 返 Hub → 放入繁殖機 → 攞寵物（教學入面 5 秒完成）→ 放上地塊 → 完成（+$100）。
- 寵物大細：真實比例（地塊入面唔再縮細，只有超過 7 米先縮），同一種動物越重越大隻（最輕 ×0.8、最重 ×1.25）。
- 50 隻動物全部重新設計：頭 20 隻 `src/animals20.js`、其餘 30 隻 `src/animals30.js`（大眼有反光、腳掌、花紋、識郁嘅耳／尾／翼）。
- 可以跳（空白鍵）：跳得過障礙物；Boss 唔識跳，你企高過 1.5 米佢捉你唔到。
- Biome 6 係一座好大嘅方塊三角形山（10 層，每層 1.3 米，要逐層跳上去），動物喺山頂出現、唔會落山；滾石由山頂前面碌落山，礦車喺山兩邊條路上落，塵埃喺山前面打橫飄；Mega Digger 喺山腳前面守。

## GitHub Issue #1（2026-10-15，小朋友喺 GitHub 開嘅）
- 小朋友揀：先做「大 Hub + 開場動畫」，其他之後做。
- ✅ Hub 變大圓形（`src/hubShape.js` 大細、`src/hubPark.js` 裝飾）：中間會噴水嘅噴水池、4 個石像（金熊貓、雲石象、金犀牛、雲石老虎）、雀仔飛圈、吊床（Owner 瞓喺度）+ 枱（杯水、pizza）、「COMING SOON」機器、遊樂場、燈柱、長櫈、花圃、一圈樹、Hub 底有大門口「ANIMAL RESCUE PARK」。繁殖機搬咗去噴水池下面（z = 40）。
- ✅ 皮膚商店冇咗「Expand Hub」：嗰啲裝飾而家 Hub 本身就有；買過嘅退返代幣。
- ✅ 新開場動畫（約 46 秒，可以跳過）：Owner 瞓吊床食 pizza → 覺得怪怪地，杯水震 → Boss 捉走動物（Owner 頭頂「!」）→ Owner 追唔到 → 手機搜尋「top tier ranger」→ Ranger 揸車由大門入嚟、握手 → 黑畫面「YOU are the ranger! Save the endangered animals to save the world. Upgrade your Treadmill and Student Table to improve!」
- 小朋友試玩後（同日）：
  - ✅ Hub 整齊啲：分區（Training Zone、入口廣場、Magic Library、Coming Soon、Breeding Lab、Owner's Garden、Playground），每區有地磚同牌，樹籬圍住噴水池；**燈柱刪走**。
  - ✅ Index 石台改做 **Magic Library**（書架、飛嚟飛去嘅書、水晶球、魔法陣；`src/hubBuildings.js`）。
  - ✅ **Sell Stall**（入口左邊，E 開；可以逐隻賣或者一次過賣晒背囊入面嘅寵物）；**Skin Shop 搬去入口右邊**。
  - ✅ 開場動畫「好似電影」：上下黑邊、鏡頭慢慢郁、對白泡泡、畫面震、轉鏡頭閃黑；Owner／Ranger 公仔有大眼、眉、面珠等細節；吉普車有防滾架、後備胎、警示燈。
  - ✅ Boss 撞到你 → 彈飛返 Hub（唔使答問題），動物走返去生態區。障礙物照舊答問題。
  - ✅ 拉桿同 BIG PET FRENZY 刪走（舊「拉桿」每日任務自動換過）。
  - ✅ Biome 6：山前面有樓梯（每級 < 0.45 米，唔使跳），企喺山上唔再減速（只係喺半空先限速）；瀑布、水池、礦洞、松樹、山頂金光圈、鷹、雪。
  - ✅ Biome 2 重做：左邊海（浪、白泡、漏油大油輪 + 黑煙 + 油污）、右邊沙灘（棕櫚樹、遮陽傘、救生員塔、沙堡、蟹、海鷗）；**執垃圾**（E，+$20，3 分鐘後再出現）。Boss 改做 **Captain Oil Spill**（揸住漏油細油輪嘅船長）。
  - ✅ 生態區大啲：42 闊 × 62 長（本來 36 × 50）。
  - 未做：畫面再靚啲、動物再型啲（要問小朋友邊啲最想改）。

## Issue #3（2026-10-17）+ Issue #2 最後一樣
- ✅ Boss Arena 大啲（半徑 26 → 40，`ARENA.r` 喺 `src/labShape.js`）；腐化動物每輪 4 → 2（`LAB_CORRUPTED_ANIMALS`）。
- ✅ 寵物皮膚每款有特效（粒子 + 會郁嘅物料，`src/skins.js` `EFFECTS`）；新皮膚 Lava 75、Frost 90、Electric 120、Diamond 150。修好 `animateSkins` 從來冇叫過嘅 bug（Rainbow 而家先識轉色）。
- ✅ 地塊寵物有稀有度光圈（Legendary／Mythic 有閃粉）。
- 等小朋友答：邊 3–5 隻寵物最悶、想點型法。
- ✅ 秘密沙灘（`src/secretBeach.js`，前院東邊，打贏 Boss 先開）：星空、流星、篝火、長櫈（E 坐低睇流星）、神秘 Ninja Ranger → 秘密結局 **THE COLLAB**（`state.collabSeen`，冇額外獎勵）。

## Issue #4（2026-10-17）
- ✅ Boss 新造型（跟小朋友張圖）：黑灰色機械人、毒綠光、綠色玻璃頭盔入面有細科學家、心口靶心眼 + 鋸齒口、生化標誌、黃黑間條手腕。
- ✅ 三個 Phase（`src/labBoss.js`，數值喺 `balance.js` `LAB_P1_HITS` 等）：P1 手拍 + 熔岩、用球棒打 12 下；P2 每 9 秒叫 1–2 個 Boss／動物、打 24 下；P3 冇球棒、佢追你，帶佢隻手拍落 Solar Capsule（1 次，小朋友可以改 `LAB_P3_CAPSULES`）。玩家唔會扣血（俾打中只係彈返起點）。
- ✅ Arena 半徑 52。
- ✅ 打贏：實驗室爆炸逃走動畫（`src/labEscape.js`）→ 見到沙灘 → 原本結局。秘密沙灘撳紅掣（開大門）就開；沙灘外面一圈棕櫚樹。
- ✅ Fuse Machine（`src/fuse.js`、`src/fusePets.js`）：`FUSE_OPEN_DATE` 2026-10-22 先開；3 隻寵物合成 1 隻：Rhinoblade／Spideron／Dunkleosteus／Puffaball／Endangered Combination。
- ✅ Biome 6 山頂嘅吊橋去到邊界牆，倒數「NEW BIOME IS COMING... In N days」（`NEW_BIOME_DATE` 2026-10-24）。

## 小朋友直接喺 Claude Code 講（2026-10-17 下晝）
- ✅ 流星雨型啲（大火流星跌落海）；結局改順序：Arena → 實驗室爆炸 → 秘密沙灘（Owner 喺度俾錢）→ 黑畫面 → 喺沙灘玩。
- ✅ 秘密沙灘搬咗去好遠（`BEACH_OFFSET` 300，唔喺實驗室隔籬），打贏 Boss 先去到：實驗室傳送門 ↔ 沙灘綠色傳送門。
- ✅ THE COLLAB：「I'm a ranger from another game!」（小朋友揀咗唔用朋友個名）。
- ✅ 外面森林 + 巨型高樹邊界；生態區牆變高山，每區唔同（`src/biomeBorders.js`）。
- ✅ 吊橋 7 米闊、跌唔落；新生態區閘門變神秘大寶庫門。
- ✅ 新升級：Royal Kingdom 地塊（+2 位、×1.5 錢）；跑步機／學生桌 Lv16 Astral King's Kingdom；繁殖機 Lv5 Dragon's Lair（×0.4 時間、一次 2 隻、答問題加速、15% Fire 變異 ×4 錢，`src/fireAura.js`）。價錢係我揀：地塊 ≈ $1.75M、Lv16 ≈ $10.6M、Dragon's Lair $15M。

## Biome 7 Enchanted Kingdom（2026-10-17）
- 小朋友揀：10 月 24 日（`NEW_BIOME_DATE`）先開；第一次行到山頂橋盡頭嘅閘門 → 開門動畫（`playKingdomReveal`，`state.kingdomSeen`）。
- 閘門後面皇家大樓梯落去；皇宮、水晶樹、浮島、天上嘅 Royal Skywhale、水晶蝴蝶、魔法符文、閃粉（`src/enchanted.js`；模型 `src/enchantedModels.js`）。
- 動物：Royal Skywhale（魔法動物，唔係真嘅，知識卡講真藍鯨）；其他動物小朋友遲啲講（會喺 GitHub 開 Issue）。
- Boss：Enchanted Royal Guardian（220M Speed／300M IQ）；障礙物：火同 essence。
- Dragon's Lair 繁殖機重新設計：龍圍住部機、蝙蝠翼、火山石拱門、金幣、玻璃罩入面有龍蛋。
- 測試：dev console `game.openKingdom()` 唔使等日期。

## 未做

- 任務／成就、每日獎勵、寵物升級、保育知識牌、Boss 戰（感化）、匯出存檔、放上網（建議清單，等小朋友揀）。

## 要小朋友決定嘅嘢（到嗰步先問都得）

- **第 6 步前**：每種動物每秒賺幾多錢？跑步機升級要幾多錢？
- **第 10 步前**：Boss 會做乜？（追玩家？守住動物？）
- **第 10 步前**：Speed 由 100 升到 2,000,000 咁大，畫面上行速點樣跟住變？（我會建議一個做法俾你揀）

## GitHub Issue #2：Laboratory + Mutated Scientist Poacher（2026-10-15）

小朋友中途改咗三次（開閘方法、傳送門、圓形 Arena、Boss 樣），以下係最後版本：

1. **開閘**：Hub 入面 Magic Library 後面有個秘密**紅色掣**（🔴 DO NOT PRESS），撳 E → 開門動畫（鐵鏈震、大鎖彈開、閘門打開、鏡頭飛過去睇實驗室）→ 地上綠色箭咀 + 畫面箭咀帶你去 Laboratory（入過一次就收埋）。未開之前閘門有鎖同牌（「Find the secret RED BUTTON」）。（本來係圖鑑 25 隻開，小朋友改咗。）
2. **Laboratory**（Hub 大門外面，南邊）：未來感實驗室——霓虹金屬地板、力場牆、全息屏幕、試管、控制台。入面有 **4 個玻璃艙**困住動物。
3. **鎚仔**：Biome 6 座山**後面**（經山兩邊窄路入去）。執咗就**永遠**喺快捷欄第 1 格（`state.hasHammer`）。拎住鎚仔行近玻璃艙撳 E／撳滑鼠 → 打爛，動物開心跳兩下就跑走。冇鎚仔會提示「You need the Hammer (found behind the mountain in Biome 6)」。
4. **傳送門開法（做到其中一樣就得）**：A. 打爛晒 4 個玻璃艙；或者 B. 喺傳送門交 3 隻 Legendary（寵物或者等繁殖嘅都得；要確認先交；佢哋會由 Index 刪走）。傳送門面板（E）會顯示兩條路。`LAB_PORTAL_BY_PODS`／`LAB_PORTAL_BY_LEGENDARY` 可以分別開關。
5. **Boss Arena**：行入傳送門 → 傳送去一個**圓形**未來感 Arena（圓形力場牆行唔出去）。一入去 Boss 就醒，開始打。南邊有綠色**出口傳送門**隨時返實驗室。
6. **Mutated Scientist Poacher**：似 Roblox「Steal an Egg」嘅 Dr. Scramble——瘋狂科學家坐喺 mech 入面（白袍、大頭、發光護目鏡、白色蓬鬆頭髮、紫手套、綠色藥水缸），**四隻機械手**有爪同霓虹燈；會喺場入面行嚟行去。每一輪招式：
   - a. 炸彈無人機（地上紅圈 = 炸彈落點）
   - b. 腐化咗嘅瀕危動物追你 30 秒，之後變灰燼（散做灰塵，冇血腥）
   - c. 傳送門出 2 個生態區 Boss 追你 1 分鐘，之後返入傳送門
   - d. 手拍：紅框**跟住你 3 秒**（小朋友加），停低之後 0.6 秒隻手拍落嚟
   - 出完晒招佢**攰**：懶散拍（大啲紅框，一樣跟住你 3 秒）→ 帶佢隻手拍落 **Solar Energy Capsule**（Arena 四圍有 4 個，攰嗰陣頭頂有黃色箭咀）。拍中一次扣一格血，樣子越嚟越殘（護目鏡裂、繃帶、冒煙、火花、頭髮燶）。拍中 4 次就贏。
7. **俾打中**（我揀，小朋友冇講）：同其他 Boss 一樣彈飛（彈返 Arena 南邊），扣 1 個心；**5 個心**（`LAB_LIVES`）冇晒 → 返實驗室，成場重來。行出口都係成場重來。傳送門開咗就一直開，可以再挑戰。
8. **結局動畫**：Boss 瞓低 → 佢啲生態區 Boss 由傳送門出嚟 → 被捉嘅瀕危動物（包括你交咗嘅 Legendary 種類）醒咗、避開啲 Boss 走 → 跑過大門 → 跑入你個地塊開心跳 → Owner 多謝你、俾你 **$1000** → 黑畫面：「You saved the endangered animals! You got paid $1000... but something's missing... the pets wanted you to stay here forever, so you decided to stay with them forever.」→ 之後照玩。
9. **存檔**：`labUnlocked`、`hasHammer`、`labPodsSmashed`、`labLegendaryGiven`、`labGivenSpecies`、`labBossDefeated`、`labRewardPaid`（$1000 只俾一次）、`labEndingSeen`。打緊嘅一場唔存（F5 重新打過）。
10. 數值全部喺 `src/data/balance.js` 嘅 `LAB_*`。
11. 我自己揀嘅（小朋友冇講）：Boss 戰「一輪」入面招式會重疊（無人機 1 秒、動物 8 秒、傳送門 16 秒、拍手一路都有），一輪大約 80 秒；Boss 手下嘅速度跟你嘅 Speed 調（唔會快過你太多）；Route B 要一次過交晒 3 隻；救出嚟嘅動物淨係動畫，唔會變寵物。
12. 以後加地方：前院（`YARD`）兩邊可以再開路（例如閘外海灘睇流星），秘密結局「THE COLLAB」未做。

測試（開發模式 console）：`game.lab.unlock()`（好似撳紅色掣）、`game.lab.open()`、`game.lab.hammer()`、`game.lab.smashAll()`、`game.lab.legendary(3)`、`game.lab.arena()`／`game.lab.start()`（直接入 Arena 開打）、`game.lab.god = true`（唔會俾打中）、`game.lab.attack('drones'|'animals'|'portal')`、`game.lab.tired()`、`game.lab.hitCapsule()`、`game.lab.ending()`、`game.lab.fight.timeScale = 3`（快轉）、`game.lab.reset()`（清晒實驗室進度）。

## 💪 Ranger Gym（小朋友 2026-10-18）
1. 小朋友再改：實驗室爆炸之後**實驗室冇咗**（`labStatus.gone`，`src/labShape.js`；`lab.building` 同佢嘅撞嘢一齊拎走），Gym 喺實驗室原位（大門向前院，z = 100）。`src/gym.js` 用「設計座標」（`GYM_LOCAL`，大門向 +x）起，成座轉 90° 搬過去（`gymToWorld`／`gymToLocal`）；世界座標 `GYM`／`GYM_DOOR`／`GYM_PORTAL` 俾 main.js、world.js 用。Gym 嘅撞嘢同彈床石台未出現就唔放入世界（`setGymPresent`）。爆炸動畫：煙最濃嗰下實驗室冇咗，Gym 由地底升上嚟，之後影 Gym 大門同前院嘅傳送門，玩完企喺 Gym 門口（`GYM_FRONT`）。
2. `GYM_OPEN_DATE = '2026-10-31'`（balance.js）先開門；之前門口有圍欄、「OPENING SOON」同倒數牌，行唔入去。
3. 門外傳送門去秘密沙灘；第一次去先播 Owner 俾錢＋流星嗰段（`state.beachFinaleSeen`；舊存檔跟 `labEndingSeen`）。實驗室傳送門一樣。
4. 入面：⚡ 4X Treadmill（每 2–4 秒 +4 × Hub 跑步機每秒）、🦘 Trampoline（自動彈，每 5 秒 +1 Jump Power，冇升級）、🧠 Brain Bench（每 3 秒 Speed + IQ 各 2 ×）、🧗 Climbing Wall of Wisdom（爬上去，每 2–4 秒 +4 × 學生桌每秒 IQ）。數值 `GYM_*`。我揀嘅：Brain Bench 同 Climbing Wall 兩部機。
5. `state.jumpPower`：每點跳高 `JUMP_POWER_HEIGHT`（0.02 米），最多計 `JUMP_POWER_MAX`（300 點 = 多 6 米）。HUD 有 🦘（有 Jump Power 先顯示），My Stats 有一行。
6. 小朋友老師話跑跑下跳會慢好多 → 取消咗半空限速（`player.js`），半空保持跑步速度。
7. 測試：`game.openGym()`（唔理日子即刻開）、`game.lab.ending()`（再睇爆炸 → Gym）。

## Hub 重新排位（2026-10-18，小朋友：rearrange everything in the hub，揀咗「You decide」）
由上面望（-z 係生態區）：

```
                 ======= Biome 1 入口 =======
  ┌─🏃 TRAINING ZONE─┐  [入口廣場]  ┌──🛍️ SHOP STREET──┐
  │ Treadmill  Table │   出世點    │ Skin Shop  Sell   │
  └──────────────────┘   (0,14)    └───────────────────┘
  ════════════════ 路 (z=10.5) ═══════════════════════════
                                   升級牌  ┌─────────┐
   ✨ MAGIC     ══╗  ⛲ 噴水池  ╔══ 閘口 ▸ │ 🐾 PLOT │ 🐾 PETS ZONE 牌
   LIBRARY       ╚═══════════╝             └─────────┘
                 熊貓像      大象像           MY PETS 牌
  ═════════════════════ 路 (z=36) ═════════════════════════
   升級牌 [💗 BREEDING LAB：5 部繁殖機]          🧪 FUSE
   🌴 Owner's Garden（吊床）    │路│     🛝 Playground
                         ANIMAL RESCUE PARK 大門
```
- 地塊（`PLOT` 而家喺 `src/hubShape.js`）搬去噴水池右邊，閘口面向噴水池條路；MY PETS 牌喺地塊下面、面向繁殖機條路（拎完寵物行過去就見到）。
- Skin Shop、Sell Stall 搬去右上 Shop Street，面向噴水池；Fuse Machine（`FUSE_MACHINE`）搬去繁殖機右邊。
- Training Zone、Magic Library、繁殖機、Owner's Garden、Playground、大門唔郁（開場動畫同教學照用）。

## 🔐 Secret Ranger Control Panel（小朋友 2026-10-18）
- 刪咗 Biome 6 橋下面嘅紅色掣；秘密沙灘個掣（圓石後面，`CRAZY_BUTTON`）變做唯一一粒秘密掣，撳 E 打開控制台（`src/adminPanel.js`，動作喺 `main.js` 嘅 `setAdminActions`）。
- 分頁：🔮 Future（提早開 Fuse + 王國 = `state.bigButton`；提早開 Gym = `state.gymEarly`）、🐾 Pets（揀任何寵物 + 稀有度 + 巨型 + Fire/Eclipse）、📖 Index（全開）、⚡ Max（跑步機／學生桌／繁殖機／地塊 MAX，之後重新載入；錢 Speed IQ Jump Power 變超多）、🎉 Events（任何活動 + Crazy Pet Frenzy + 喺指定生態區出指定稀有度）、💾 Safety（第一次改嘢之前備份真存檔 `animal-rescue-save-v1-backup`，一撳還原）。
- 公園大閘（去實驗室）以前要撳紅掣先開；而家行到閘前面撳 E「Break the chains」就開（唔係咁就打唔到 Boss、去唔到沙灘）。
- 王國開門動畫：日期到咗（或者提早開咗）而未睇過嘅玩家，一入遊戲（開場、選裝置、教學之後）1.5 秒就自動播一次，播完返返原位；行到閘門前面就照舊即刻播 + 傳送去樓梯。
