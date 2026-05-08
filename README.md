# 🃏 Poker World — 多人撲克遊戲平台

> React/Next.js + Socket.io 全端多人撲克遊戲系統

---

## 🚀 快速啟動

```bash
# 方式一：一鍵啟動 (推薦)
雙擊 start.bat

# 方式二：分開啟動
cd server && node index.js       # Port 3001
cd client && npm run dev         # Port 3000
```

瀏覽器開啟 → **http://localhost:3000**

---

## 🏗️ 系統架構

```
撲克牌遊戲/
├── server/
│   ├── index.js                 # Socket.io 主伺服器
│   └── engine/
│       ├── cardEngine.js        # 牌組建立/洗牌/發牌
│       ├── sortProvider.js      # 🎯 通用理牌引擎 (核心)
│       ├── roomManager.js       # 房間管理 + 投票 + 排程
│       └── trashTalk.js         # 嗆人字詞庫
├── client/
│   └── src/
│       ├── context/
│       │   ├── SocketContext.tsx  # Socket.io React Context
│       │   └── GameContext.tsx    # 全局遊戲狀態 (useReducer)
│       ├── components/
│       │   ├── Card.tsx           # 撲克牌視覺元件
│       │   ├── LobbyPage.tsx      # 大廳頁面
│       │   ├── RoomPage.tsx       # 等待房間頁面
│       │   ├── GamePage.tsx       # 遊戲主頁面
│       │   ├── VotePage.tsx       # 投票頁面
│       │   └── AppRouter.tsx      # 頁面路由
│       └── app/
│           ├── globals.css        # 全局深色主題樣式
│           ├── layout.tsx
│           └── page.tsx
└── shared/
    └── types.ts                   # TypeScript 型別定義
```

---

## ✨ 功能列表

### 1. 🎯 通用理牌引擎 (SortProvider)
- **Strategy Pattern** 設計 — 解耦、可擴充
- 支援 6 種遊戲模式各自的排序邏輯：

| 遊戲 | 排序邏輯 |
|------|----------|
| 大老二 | 依牌型群組(對子/三條)，再按權重(2最大) |
| 橋牌/接龍 | 花色分堆，再按數字升序 |
| 鬥地主 | 火箭→炸彈→三條→對子→單張 |
| 十三支 | 智能三道分配 (頭3/中5/尾5) |
| 德州撲克 | 數字降序，A最大 |

- **快捷鍵**：`Space` = 自動理牌
- `autoSort(hand, gameContext)` API

### 2. 🎮 房主自定義遊戲序列 (Playlist)
- 建房時可多選遊戲並設定順序
- 每局結束自動載入下一個遊戲模式
- 自動切換理牌規則與介面

### 3. 🗳️ 投票系統 (15秒倒數)
- 圓形倒數計時動畫
- 超時自動跟票給當前最高票
- 全體未投 / 平票 → 返回大廳

### 4. 🏠 高可靠性房間管理
- 斷線即踢出
- **房主繼承**: 搜尋 `joinedAt` 最早的剩餘玩家繼承

### 5. 💬 嗆人系統
- 快捷指令: `!gg` `!wp` `!lol` `!rush` `!cry` `!random`
- 六大遊戲各自的語境嗆人語句庫
- 即時廣播給房間所有玩家

---

## 📡 Socket.io 事件表

| 方向 | 事件 | 說明 |
|------|------|------|
| C→S | `room:create` | 建立房間 |
| C→S | `room:join` | 加入房間 |
| C→S | `game:start` | 開始遊戲 (房主) |
| C→S | `game:sortHand` | 理牌 |
| C→S | `game:playCards` | 出牌 |
| C→S | `vote:cast` | 投票 |
| C→S | `trash:send` | 傳送嗆人訊息 |
| S→C | `room:updated` | 房間狀態更新 |
| S→C | `game:cardDealt` | 發牌 |
| S→C | `game:sorted` | 理牌結果 |
| S→C | `host:migrated` | 房主轉讓 |
| S→C | `vote:started` | 開始投票 |
| S→C | `vote:result` | 投票結果 |
| S→C | `trash:talk` | 嗆人廣播 |

---

## 🎨 設計規格
- **主色**: `#6c63ff` (紫色)
- **背景**: `#0a0a14` (深夜藍)
- **成功**: `#06d6a0` (翡翠綠)
- **危險**: `#ef233c` (火紅)
- **字體**: Inter + Outfit (Google Fonts)
- **風格**: 深色玻璃態 + 微動畫

---

## 🔌 新增遊戲模式

只需在 `sortProvider.js` 新增一個 case：

```js
// 1. 在 RANK_WEIGHTS 加入新遊戲的權重
const RANK_WEIGHTS = {
  my_new_game: { '2':1, '3':2, ... },
};

// 2. 新增排序函式
function sortMyNewGame(hand) { ... }

// 3. 在 SortProvider.autoSort() 加 case
case 'my_new_game': return sortMyNewGame(hand);
```
